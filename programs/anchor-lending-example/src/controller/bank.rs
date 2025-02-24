use anchor_lang::{prelude::*, Discriminator};
use arrayref::array_ref;

use crate::protocol::{Bank, BANK_SPACE};

// Add custom error for missing banks
#[error_code]
pub enum BankError {
    #[msg("Missing required banks")]
    MissingRequiredBanks,
}

pub struct BankInterface<'a> {
    pub banks: Vec<(u8, AccountLoader<'a, Bank>)>,
}

impl<'a> BankInterface<'a> {
    /// Load bank interface with required and optional bank accounts
    /// @param remaining_account - List of required bank accounts
    /// @param bank_ids - List of required bank IDs
    /// @param optional_bank - Optional single bank account to include
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
                msg!("Missing required bank with ID: {}", required_id);
                return Err(error!(BankError::MissingRequiredBanks));
            }
        }

        Ok(bank_interface)
    }
}
