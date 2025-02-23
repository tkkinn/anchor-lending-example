/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/anchor_lending_example.json`.
 */
export type AnchorLendingExample = {
  address: "HKViZ7i7fEpfqcpCpDWAfmZpuVZ6WSRXST85nf1w227q";
  metadata: {
    name: "anchorLendingExample";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "deposit";
      docs: [
        "Deposit tokens into a bank",
        "User must sign the transaction and provide token account with sufficient balance"
      ];
      discriminator: [242, 35, 198, 137, 82, 225, 242, 182];
      accounts: [
        {
          name: "user";
          docs: ["User's wallet that must sign"];
          writable: true;
          signer: true;
        },
        {
          name: "userTokenAccount";
          docs: ["User's token account to deposit from"];
          writable: true;
        },
        {
          name: "bankTokenAccount";
          docs: ["Bank's token account to deposit to"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "userAccount";
          docs: ["User account to update balance"];
          writable: true;
        },
        {
          name: "bank";
          docs: ["Bank account to validate status"];
          writable: true;
        },
        {
          name: "tokenProgram";
          docs: ["Token program, either Token or Token2022"];
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "initialize";
      docs: [
        "Initialize the lending program by creating an admin account",
        "The admin account will have authority over certain program functions"
      ];
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: "admin";
          docs: ["The admin account to be initialized"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 100, 109, 105, 110];
              }
            ];
          };
        },
        {
          name: "authority";
          docs: ["The authority that will have admin privileges"];
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "initializeBank";
      docs: [
        "Initialize configuration for a new bank",
        "Can only be called by the admin authority"
      ];
      discriminator: [217, 55, 77, 45, 245, 197, 75, 140];
      accounts: [
        {
          name: "admin";
          docs: ["The admin account"];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 100, 109, 105, 110];
              }
            ];
          };
        },
        {
          name: "pool";
          docs: ["The pool account"];
          writable: true;
        },
        {
          name: "bank";
          docs: ["The bank account to initialize"];
          writable: true;
        },
        {
          name: "mint";
          docs: ["The token mint"];
        },
        {
          name: "tokenAccount";
          docs: ["The token account owned by bank PDA"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "authority";
          docs: ["The authority that must sign to initialize bank"];
          writable: true;
          signer: true;
          relations: ["admin"];
        },
        {
          name: "tokenProgram";
          docs: ["Token program"];
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "groupId";
          type: "u8";
        }
      ];
    },
    {
      name: "initializePool";
      docs: [
        "Initialize a new pool",
        "Can only be called by the admin authority"
      ];
      discriminator: [95, 180, 10, 172, 84, 174, 232, 40];
      accounts: [
        {
          name: "admin";
          docs: ["The admin account to be updated"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 100, 109, 105, 110];
              }
            ];
          };
        },
        {
          name: "pool";
          docs: ["The pool account to initialize"];
          writable: true;
        },
        {
          name: "authority";
          docs: ["The authority that must sign this transaction"];
          writable: true;
          signer: true;
          relations: ["admin"];
        },
        {
          name: "systemProgram";
          docs: ["System program for CPI"];
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "initializeUser";
      docs: [
        "Initialize a new user account with unique ID in a specific token group",
        "This creates a PDA account for the user that will hold their lending protocol state"
      ];
      discriminator: [111, 17, 185, 250, 60, 122, 38, 254];
      accounts: [
        {
          name: "user";
          docs: ["The new user account to be created"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "arg";
                path: "poolId";
              },
              {
                kind: "arg";
                path: "userId";
              },
              {
                kind: "account";
                path: "authority";
              }
            ];
          };
        },
        {
          name: "authority";
          docs: ["The authority (owner) of the user account"];
          writable: true;
          signer: true;
        },
        {
          name: "admin";
          docs: ["The admin account for the protocol"];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 100, 109, 105, 110];
              }
            ];
          };
        },
        {
          name: "systemProgram";
          docs: ["System program for CPI"];
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "poolId";
          type: "u8";
        },
        {
          name: "userId";
          type: "u16";
        }
      ];
    },
    {
      name: "updateAuthority";
      docs: [
        "Update the admin authority to a new account",
        "Can only be called by the current authority"
      ];
      discriminator: [32, 46, 64, 28, 149, 75, 243, 88];
      accounts: [
        {
          name: "admin";
          docs: ["The admin account to update"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 100, 109, 105, 110];
              }
            ];
          };
        },
        {
          name: "authority";
          docs: ["The current authority that must sign"];
          signer: true;
          relations: ["admin"];
        },
        {
          name: "newAuthority";
          docs: ["The new authority to be set"];
        }
      ];
      args: [];
    },
    {
      name: "updateBankStatus";
      docs: [
        "Update the operational status of a bank",
        "Can only be called by the admin authority"
      ];
      discriminator: [75, 255, 49, 191, 115, 239, 30, 148];
      accounts: [
        {
          name: "admin";
          docs: ["The admin account"];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 100, 109, 105, 110];
              }
            ];
          };
        },
        {
          name: "authority";
          docs: ["The authority that must sign"];
          signer: true;
          relations: ["admin"];
        },
        {
          name: "bank";
          docs: ["The bank account to update"];
          writable: true;
        }
      ];
      args: [
        {
          name: "newStatus";
          type: "u8";
        }
      ];
    },
    {
      name: "withdraw";
      docs: [
        "Withdraw tokens from a bank",
        "User must sign the transaction and have sufficient balance in their user account"
      ];
      discriminator: [183, 18, 70, 156, 148, 109, 161, 34];
      accounts: [
        {
          name: "user";
          docs: ["User's wallet that must sign"];
          writable: true;
          signer: true;
        },
        {
          name: "userTokenAccount";
          docs: ["User's token account to withdraw to"];
          writable: true;
        },
        {
          name: "bankTokenAccount";
          docs: ["Bank's token account to withdraw from"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ];
              },
              {
                kind: "account";
                path: "bank";
              }
            ];
          };
        },
        {
          name: "userAccount";
          docs: ["User account to update balance"];
          writable: true;
        },
        {
          name: "bank";
          docs: ["Bank account to validate status and sign token transfer"];
          writable: true;
        },
        {
          name: "tokenProgram";
          docs: ["Token program, either Token or Token2022"];
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "admin";
      discriminator: [244, 158, 220, 65, 8, 73, 4, 65];
    },
    {
      name: "bank";
      discriminator: [142, 49, 166, 242, 50, 66, 97, 188];
    },
    {
      name: "pool";
      discriminator: [241, 154, 109, 4, 17, 177, 109, 188];
    },
    {
      name: "user";
      discriminator: [159, 117, 95, 227, 239, 151, 58, 236];
    }
  ];
  events: [
    {
      name: "adminAuthorityUpdated";
      discriminator: [123, 175, 81, 239, 14, 93, 204, 151];
    },
    {
      name: "adminInitialized";
      discriminator: [237, 223, 71, 11, 140, 218, 196, 171];
    },
    {
      name: "bankInitialized";
      discriminator: [12, 70, 239, 83, 166, 159, 112, 156];
    },
    {
      name: "bankStatusUpdated";
      discriminator: [20, 241, 184, 46, 202, 162, 62, 230];
    },
    {
      name: "userBalanceUpdated";
      discriminator: [229, 61, 41, 151, 217, 169, 131, 105];
    },
    {
      name: "userInitialized";
      discriminator: [66, 195, 5, 223, 42, 84, 135, 60];
    },
    {
      name: "anchor_lending_example::protocol::event::PoolInitialized";
      discriminator: [100, 118, 173, 87, 12, 198, 254, 229];
    },
    {
      name: "anchor_lending_example::protocol::instructions::initialize_pool::PoolInitialized";
      discriminator: [100, 118, 173, 87, 12, 198, 254, 229];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "alreadyInitialized";
      msg: "User account already initialized";
    },
    {
      code: 6001;
      name: "invalidAuthority";
      msg: "Invalid authority provided";
    },
    {
      code: 6002;
      name: "balanceUpdateOverflow";
      msg: "Balance update overflow";
    },
    {
      code: 6003;
      name: "maxTokenTypes";
      msg: "Reach max token types in a single account, no extra token types can be insert, consider create a new account.";
    },
    {
      code: 6004;
      name: "poolNotFound";
      msg: "Pool not found";
    }
  ];
  types: [
    {
      name: "admin";
      docs: ["Admin account data"];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: ["The authority pubkey that has admin privileges"];
            type: "pubkey";
          },
          {
            name: "poolCount";
            docs: ["Number of pools that have been initialized"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "adminAuthorityUpdated";
      docs: ["Event emitted when admin authority is updated"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            docs: ["The admin account address"];
            type: "pubkey";
          },
          {
            name: "oldAuthority";
            docs: ["The old authority"];
            type: "pubkey";
          },
          {
            name: "newAuthority";
            docs: ["The new authority"];
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "adminInitialized";
      docs: ["Event emitted when admin is initialized"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "admin";
            docs: ["The admin account address"];
            type: "pubkey";
          },
          {
            name: "authority";
            docs: ["The authority set for this admin"];
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "bank";
      docs: ["Bank account data"];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            docs: ["The token mint address"];
            type: "pubkey";
          },
          {
            name: "poolId";
            docs: ["The pool ID"];
            type: "u8";
          },
          {
            name: "bankId";
            docs: ["The bank ID within the pool"];
            type: "u8";
          },
          {
            name: "bump";
            docs: ["The PDA bump seed"];
            type: "u8";
          },
          {
            name: "status";
            docs: ["Current operational status"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "bankInitialized";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "groupId";
            type: "u8";
          },
          {
            name: "status";
            type: "u8";
          },
          {
            name: "tokenAccount";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "bankStatusUpdated";
      docs: ["Event emitted when bank status is updated"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "mint";
            docs: ["The token mint address"];
            type: "pubkey";
          },
          {
            name: "oldStatus";
            docs: ["Previous bank status"];
            type: "u8";
          },
          {
            name: "newStatus";
            docs: ["New bank status"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "pool";
      docs: ["Pool account data"];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "bankCount";
            docs: ["Number of banks initialized in this pool"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "tokenBalance";
      docs: ["Represents a single token balance entry"];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "balance";
            docs: ["Balance amount (can be negative)"];
            type: "i64";
          },
          {
            name: "bankId";
            docs: ["Bank identifier for the token"];
            type: "u8";
          },
          {
            name: "padding";
            docs: ["Padding for memory alignment"];
            type: {
              array: ["u8", 7];
            };
          }
        ];
      };
    },
    {
      name: "user";
      docs: ["Represents a user account in the lending protocol"];
      serialization: "bytemuck";
      repr: {
        kind: "c";
      };
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: ["The user's authority (usually their wallet address)"];
            type: "pubkey";
          },
          {
            name: "id";
            docs: ["Unique identifier for the user"];
            type: "u16";
          },
          {
            name: "poolId";
            docs: ["Pool identifier"];
            type: "u8";
          },
          {
            name: "bump";
            docs: ["Bump seed for PDA validation"];
            type: "u8";
          },
          {
            name: "padding";
            docs: ["Padding for memory alignment"];
            type: {
              array: ["u8", 4];
            };
          },
          {
            name: "tokenBalances";
            docs: [
              "Token balances stored as array of TokenBalance",
              "Maximum 16 different tokens per user"
            ];
            type: {
              array: [
                {
                  defined: {
                    name: "tokenBalance";
                  };
                },
                16
              ];
            };
          }
        ];
      };
    },
    {
      name: "userBalanceUpdated";
      docs: ["Event emitted when a user's token balance is updated"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "user";
            docs: ["The user account address"];
            type: "pubkey";
          },
          {
            name: "tokenId";
            docs: ["Token ID"];
            type: "u8";
          },
          {
            name: "previousBalance";
            docs: ["Previous balance"];
            type: "u64";
          },
          {
            name: "newBalance";
            docs: ["New balance"];
            type: "u64";
          },
          {
            name: "timestamp";
            docs: ["Timestamp of the update"];
            type: "i64";
          }
        ];
      };
    },
    {
      name: "userInitialized";
      docs: ["Event emitted when a new user account is initialized"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "user";
            docs: ["The user account address"];
            type: "pubkey";
          },
          {
            name: "authority";
            docs: ["The user's authority"];
            type: "pubkey";
          },
          {
            name: "userId";
            docs: ["The user's ID"];
            type: "u16";
          },
          {
            name: "poolId";
            docs: ["Pool ID"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "anchor_lending_example::protocol::event::PoolInitialized";
      docs: ["Event emitted when a new pool is initialized"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolId";
            docs: ["The pool ID that was initialized"];
            type: "u8";
          },
          {
            name: "authority";
            docs: ["The authority that initialized it"];
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "anchor_lending_example::protocol::instructions::initialize_pool::PoolInitialized";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolCount";
            type: "u8";
          },
          {
            name: "poolId";
            type: "u8";
          }
        ];
      };
    }
  ];
};
