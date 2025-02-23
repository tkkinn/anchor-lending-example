use anchor_lang::prelude::*;
use anchor_spl::{
    token_interface::{Mint, TokenAccount},
    *,
};

/// Interface for working with both token and token-2022 programs
/// At least one program must be provided
pub struct TokenInstructionInterface<'a> {
    pub token_program: Option<AccountInfo<'a>>,
    pub token_2022_program: Option<AccountInfo<'a>>,
    pub mints: Option<Vec<AccountInfo<'a>>>, // Changed to optional vector
}

impl<'a> TokenInstructionInterface<'a> {
    /// Loads token program interfaces from provided accounts
    /// Returns TokenInterface with optional programs and any mint accounts found
    pub fn load(
        token_interface: &AccountInfo<'a>,
        remaining_accounts: &[AccountInfo<'a>],
    ) -> Result<Self> {
        let mut token_program: Option<AccountInfo<'a>> = None;
        let mut token_2022_program: Option<AccountInfo<'a>> = None;
        let mut mints: Option<Vec<AccountInfo<'a>>> = None;

        // First check the token_interface account
        if token_interface.key() == token::ID {
            token_program = Some(token_interface.clone());
        } else if token_interface.key() == token_2022::ID {
            token_2022_program = Some(token_interface.clone());
        }

        // Then scan remaining accounts for any missing program and mints
        for account in remaining_accounts {
            if account.key() == token::ID && token_program.is_none() {
                token_program = Some(account.clone());
            } else if account.key() == token_2022::ID && token_2022_program.is_none() {
                token_2022_program = Some(account.clone());
            } else if account.owner == &token::ID || account.owner == &token_2022::ID {
                // Initialize mints vector if this is first mint account found
                if mints.is_none() {
                    mints = Some(Vec::new());
                }
                // Add mint account to the vector
                mints.as_mut().unwrap().push(account.clone());
            }
        }

        // At least one program must be found
        if token_program.is_none() && token_2022_program.is_none() {
            return Err(ProgramError::InvalidAccountData.into());
        }

        Ok(Self {
            token_program,
            token_2022_program,
            mints,
        })
    }

    /// Transfer tokens from one account to another
    /// Uses the appropriate token program based on the mint type
    pub fn transfer(
        &self,
        source: AccountInfo<'a>,
        destination: AccountInfo<'a>,
        authority: AccountInfo<'a>,
        amount: u64,
    ) -> Result<()> {
        let token_program = match *source.owner {
            token::ID => self
                .token_program
                .as_ref()
                .ok_or(ProgramError::InvalidAccountData)?,
            token_2022::ID => self
                .token_2022_program
                .as_ref()
                .ok_or(ProgramError::InvalidAccountData)?,
            _ => return Err(ProgramError::InvalidAccountData.into()),
        };

        // Try transfer_checked if mints are available
        if let Some(mints) = &self.mints {
            let source_data = TokenAccount::try_deserialize(&mut source.data.borrow().as_ref())?;

            // Find mint account that matches source token account's mint
            if let Some(mint) = mints.iter().find(|m| m.key() == source_data.mint) {
                let decimal = Mint::try_deserialize(&mut mint.data.borrow().as_ref())?.decimals;
                token_interface::transfer_checked(
                    CpiContext::new(
                        token_program.to_account_info(),
                        token_interface::TransferChecked {
                            from: source,
                            mint: mint.clone(),
                            to: destination,
                            authority,
                        },
                    ),
                    amount,
                    decimal,
                )?;
                return Ok(());
            }
        }

        // Fallback to regular transfer if mints not provided or matching mint not found
        #[allow(deprecated)]
        token_interface::transfer(
            CpiContext::new(
                token_program.to_account_info(),
                token_interface::Transfer {
                    from: source,
                    to: destination,
                    authority,
                },
            ),
            amount,
        )?;
        Ok(())
    }

    /// Transfer tokens using a PDA as the authority signer
    /// Uses the appropriate token program based on the mint type
    pub fn transfer_with_signer(
        &self,
        source: AccountInfo<'a>,
        destination: AccountInfo<'a>,
        authority: AccountInfo<'a>,
        amount: u64,
        signer_seeds: &[&[u8]],
    ) -> Result<()> {
        let token_program = match *source.owner {
            token::ID => self
                .token_program
                .as_ref()
                .ok_or(ProgramError::InvalidAccountData)?,
            token_2022::ID => self
                .token_2022_program
                .as_ref()
                .ok_or(ProgramError::InvalidAccountData)?,
            _ => return Err(ProgramError::InvalidAccountData.into()),
        };

        // Try transfer_checked if mints are available
        if let Some(mints) = &self.mints {
            let source_data = TokenAccount::try_deserialize(&mut source.data.borrow().as_ref())?;

            // Find mint account that matches source token account's mint
            if let Some(mint) = mints.iter().find(|m| m.key() == source_data.mint) {
                let decimal = Mint::try_deserialize(&mut mint.data.borrow().as_ref())?.decimals;
                token_interface::transfer_checked(
                    CpiContext::new_with_signer(
                        token_program.to_account_info(),
                        token_interface::TransferChecked {
                            from: source,
                            mint: mint.clone(),
                            to: destination,
                            authority,
                        },
                        &[signer_seeds],
                    ),
                    amount,
                    decimal,
                )?;
                return Ok(());
            }
        }

        // Fallback to regular transfer if mints not provided or matching mint not found
        #[allow(deprecated)]
        token_interface::transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                token_interface::Transfer {
                    from: source,
                    to: destination,
                    authority,
                },
                &[signer_seeds],
            ),
            amount,
        )?;
        Ok(())
    }
}
