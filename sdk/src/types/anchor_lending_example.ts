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
      name: "initializeTokenConfig";
      docs: [
        "Initialize configuration for a new token",
        "Can only be called by the admin authority"
      ];
      discriminator: [60, 14, 114, 86, 25, 84, 93, 149];
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
          name: "tokenConfig";
          docs: ["The token config account to initialize"];
          writable: true;
        },
        {
          name: "mint";
          docs: ["The token mint"];
        },
        {
          name: "tokenAccount";
          docs: ["The token account owned by token config PDA"];
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
                path: "tokenConfig";
              }
            ];
          };
        },
        {
          name: "authority";
          docs: ["The authority that must sign to initialize token config"];
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
      name: "initializeTokenGroup";
      docs: [
        "Initialize a new token group",
        "Can only be called by the admin authority"
      ];
      discriminator: [87, 246, 48, 126, 123, 0, 229, 62];
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
          name: "authority";
          docs: ["The authority that must sign this transaction"];
          signer: true;
          relations: ["admin"];
        }
      ];
      args: [];
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
      name: "updateTokenConfigStatus";
      docs: [
        "Update the operational status of a token config",
        "Can only be called by the admin authority"
      ];
      discriminator: [153, 159, 241, 140, 69, 10, 238, 253];
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
          name: "tokenConfig";
          docs: ["The token config account to update"];
          writable: true;
        }
      ];
      args: [
        {
          name: "newStatus";
          type: "u8";
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
      name: "tokenConfig";
      discriminator: [92, 73, 255, 43, 107, 51, 117, 101];
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
      name: "tokenConfigInitialized";
      discriminator: [216, 229, 55, 155, 204, 69, 244, 40];
    },
    {
      name: "tokenConfigStatusUpdated";
      discriminator: [87, 11, 11, 85, 138, 95, 183, 52];
    },
    {
      name: "anchor_lending_example::protocol::event::TokenGroupInitialized";
      discriminator: [131, 122, 251, 192, 58, 116, 250, 65];
    },
    {
      name: "anchor_lending_example::protocol::instructions::initialize_token_group::TokenGroupInitialized";
      discriminator: [131, 122, 251, 192, 58, 116, 250, 65];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "unauthorized";
      msg: "Operation not authorized";
    },
    {
      code: 6001;
      name: "invalidGroupId";
      msg: "Invalid group ID";
    },
    {
      code: 6002;
      name: "invalidInput";
      msg: "Invalid input";
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
            name: "tokenGroupCount";
            docs: ["Number of token groups that have been initialized"];
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
      name: "tokenConfig";
      docs: ["Token config account data"];
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
            name: "groupId";
            docs: ["The token group ID"];
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
      name: "tokenConfigInitialized";
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
      name: "tokenConfigStatusUpdated";
      docs: ["Event emitted when token config status is updated"];
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
            docs: ["Previous token status"];
            type: "u8";
          },
          {
            name: "newStatus";
            docs: ["New token status"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "anchor_lending_example::protocol::event::TokenGroupInitialized";
      docs: ["Event emitted when a new token group is initialized"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "groupId";
            docs: ["The group ID that was initialized"];
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
      name: "anchor_lending_example::protocol::instructions::initialize_token_group::TokenGroupInitialized";
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenGroupCount";
            type: "u8";
          }
        ];
      };
    }
  ];
};
