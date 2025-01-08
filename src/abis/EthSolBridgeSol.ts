// 桥接relayer的abi
const TOKEN_BRIDGE_RELAYER_ABI = [
    {
        "type": "function",
        "name": "transferTokensWithRelay",
        "inputs":
            [
                { "name": "token", "type": "address", "internalType": "address" },
                { "name": "amount", "type": "uint256", "internalType": "uint256" },
                { "name": "toNativeTokenAmount", "type": "uint256", "internalType": "uint256" },
                { "name": "targetChain", "type": "uint16", "internalType": "uint16" },
                { "name": "targetRecipient", "type": "bytes32", "internalType": "bytes32" },
                { "name": "batchId", "type": "uint32", "internalType": "uint32" }
            ],
        "outputs":
            [{ "name": "messageSequence", "type": "uint64", "internalType": "uint64" }],
        "stateMutability": "payable"
    }

];

// 桥接relayer的abi
const APPROVE_BRIDGE_RELAYER_ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function",
        "stateMutability": "view"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "value", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function",
        "stateMutability": "nonpayable"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function",
        "stateMutability": "nonpayable"
    },
    {
        "constant": true,
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function",
        "stateMutability": "view"
    }
];



//ethereum 转账. wsol to wsol
const ETH_TRANSFER_SOL_TO_SOL_ABI = [
    {
        constant: false,
        inputs: [
            { name: '_to', type: 'address' },
            { name: '_value', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ name: '', type: 'bool' }],
        type: 'function',
    },
]

//ethereum 转账. usdt.usdc to usdt.usdc
const ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI = [
    {
        constant: false,
        inputs: [
            { name: '_to', type: 'address' },
            { name: '_value', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ name: '', type: 'bool' }],
        type: 'function',
    },
]

export { TOKEN_BRIDGE_RELAYER_ABI, APPROVE_BRIDGE_RELAYER_ABI, ETH_TRANSFER_SOL_TO_SOL_ABI, ETH_TRANSFER_USDT_USDC_TO_USDT_USDC_ABI }