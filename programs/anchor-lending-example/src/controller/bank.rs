use anchor_lang::{prelude::*, Discriminator};
use arrayref::array_ref;

use crate::controller::oracle::calculate_token_value;
use crate::protocol::{Bank, BANK_SPACE};
use crate::user::state::{BalanceType, TokenBalance};

#[error_code]
pub enum BankError {
    #[msg("Missing required banks")]
    MissingRequiredBanks,
    #[msg("Bank not found for token balance")]
    BankNotFound,
    #[msg("Math overflow in collateral calculation")]
    CollateralOverflow,
    #[msg("Math overflow in liability calculation")]
    LiabilityOverflow,
    #[msg("Math overflow in final net value calculation")]
    NetValueOverflow,
}

#[event]
pub struct CalculatedUserValue {
    /// Total collateral value in USD (6 decimals)
    pub collateral: u128,
    /// Total liability value in USD (6 decimals)
    pub liability: u128,
    /// Net value in USD (6 decimals)
    pub net_value: u128,
}

pub struct BankInterface<'a> {
    pub banks: Vec<(u8, AccountLoader<'a, Bank>)>,
}

impl<'a> BankInterface<'a> {
    /// Load bank interface with required and optional bank accounts
    /// @param remaining_account - List of required bank accounts
    /// @param bank_ids - List of required bank IDs
    pub fn load<'c: 'a>(
        bank_ids: Vec<u8>,
        remaining_account: &'c [AccountInfo<'a>],
    ) -> Result<BankInterface<'a>> {
        let mut bank_interface = BankInterface { banks: vec![] };

        // Process all accounts
        for account_info in remaining_account.iter() {
            // Skip if account owner is not the program
            if account_info.owner != &crate::ID {
                continue;
            }

            let data = account_info.try_borrow_data()?;

            if data.len() != BANK_SPACE {
                continue;
            }

            if array_ref![data, 0, 8] != &Bank::DISCRIMINATOR {
                continue;
            }

            let account_loader: AccountLoader<'_, Bank> = AccountLoader::try_from(account_info)?;
            let bank = account_loader.load()?;
            if bank_interface
                .banks
                .iter()
                .any(|(id, _loader)| *id == bank.bank_id)
            {
                continue;
            }
            bank_interface
                .banks
                .push((bank.bank_id, account_loader.clone()));
        }

        // Validate that all required banks are present
        for required_id in bank_ids.iter() {
            if !bank_interface.banks.iter().any(|(id, _)| id == required_id) {
                return Err(error!(BankError::MissingRequiredBanks));
            }
        }

        Ok(bank_interface)
    }

    /// Calculates the total collateral value (sum of collateral balances)
    /// Returns the sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total collateral value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    fn calculate_total_collateral_value(
        &self,
        token_balances: &[TokenBalance; 16],
    ) -> Result<u128> {
        let mut total: u128 = 0;

        for balance in token_balances.iter() {
            // Skip non-collateral balances or empty slots
            if balance.balance_type != BalanceType::Collateral as u8
                || balance.balance == 0
                || balance.bank_id == 0
            {
                continue;
            }

            // Find corresponding bank
            let bank = self
                .banks
                .iter()
                .find(|(id, _)| *id == balance.bank_id)
                .ok_or(error!(BankError::BankNotFound))?
                .1
                .load()?;

            // Calculate USD value for this collateral balance
            let usd_value =
                calculate_token_value(balance.balance, bank.decimals, &bank.price_message)?;

            // Add to total collateral value
            total = total
                .checked_add(usd_value as u128)
                .ok_or(error!(BankError::CollateralOverflow))?;

            msg!(
                "Added collateral value {} for bank {}",
                usd_value,
                bank.bank_id
            );
        }

        msg!("Total collateral value: {}", total);
        Ok(total)
    }

    /// Calculates the total liability value (sum of liability balances)
    /// Returns the sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total liability value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    fn calculate_total_liability_value(&self, token_balances: &[TokenBalance; 16]) -> Result<u128> {
        let mut total: u128 = 0;

        for balance in token_balances.iter() {
            // Skip non-liability balances or empty slots
            if balance.balance_type != BalanceType::Liability as u8
                || balance.balance == 0
                || balance.bank_id == 0
            {
                continue;
            }

            // Find corresponding bank
            let bank = self
                .banks
                .iter()
                .find(|(id, _)| *id == balance.bank_id)
                .ok_or(error!(BankError::BankNotFound))?
                .1
                .load()?;

            // Calculate USD value for this liability balance
            let usd_value =
                calculate_token_value(balance.balance, bank.decimals, &bank.price_message)?;

            // Add to total liability value
            total = total
                .checked_add(usd_value as u128)
                .ok_or(error!(BankError::LiabilityOverflow))?;

            msg!(
                "Added liability value {} for bank {}",
                usd_value,
                bank.bank_id
            );
        }

        msg!("Total liability value: {}", total);
        Ok(total)
    }

    /// Calculates the net value (total collateral minus total liability)
    /// Returns the net sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Net value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    ///   - Net value becomes negative (underflow)
    ///
    /// # Example
    ///
    /// ```ignore
    /// let net_value = bank_interface.calculate_total_value(user.token_balances)?;
    /// ```
    pub fn calculate_total_value(&self, token_balances: [TokenBalance; 16]) -> Result<u128> {
        let collateral = self.calculate_total_collateral_value(&token_balances)?;
        let liability = self.calculate_total_liability_value(&token_balances)?;

        // Ensure collateral covers liability
        if collateral < liability {
            msg!(
                "Insufficient collateral ({}) to cover liability ({})",
                collateral,
                liability
            );
            return Err(error!(BankError::NetValueOverflow));
        }

        // Calculate net value (guaranteed no underflow due to above check)
        let net_value = collateral - liability;
        msg!(
            "Net value calculation: {} - {} = {}",
            collateral,
            liability,
            net_value
        );

        emit!(CalculatedUserValue {
            collateral,
            liability,
            net_value
        });

        Ok(net_value)
    }
}
