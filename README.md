# GhostKeys

<p align="center">
  <img src="web/public/ghost-mascot.jpg" alt="GhostKeys mascot" width="200" />
</p>

<p align="center">
  <strong>when the code hits and your phone is three rooms away</strong>
</p>

GhostKeys is a wallet-backed authenticator on **Monad**. Save 2FA accounts once, unlock them on any device by connecting the same wallet, and copy time-based codes when you need them.

## Try it locally

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:4321 — connect your wallet on the landing page to open GhostKeys.

Network, RPC, and contract address are in `web/src/lib/config.ts` (not env).

## Deployed contract (Monad mainnet)

| | |
|--|--|
| Address | [`0xF4c908b91876a3fa839c1457f4eEfD119ED6901C`](https://monadvision.com/address/0xF4c908b91876a3fa839c1457f4eEfD119ED6901C) |
| Deploy tx | [`0x47fa19bd…c94943`](https://monadvision.com/tx/0x47fa19bdb027c05e478067497d1edacafc32eb07281224895df7a273e5c94943) |
| Chain ID | `143` |
| RPC | `https://rpc.monad.xyz` |
| Config | `web/src/lib/config.ts` (`network: "mainnet"`) |

## How it works

1. Connect your wallet on Monad.
2. Sign to unlock (bound to this site, network, wallet, and contract). No gas for unlock.
3. Add a 2FA setup key. Encryption happens in the browser.
4. Encrypted data is stored on Monad. Codes are generated on your device.

## Project layout

```
web/         Landing + app (Astro, React, HeroUI)
contracts/   SecretVault (Foundry)
```

### Redeploy contracts (optional)

```bash
cd contracts
forge install foundry-rs/forge-std
forge test --match-contract SecretVaultTest
forge script script/DeploySecretVault.s.sol:DeploySecretVault \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --private-key $PRIVATE_KEY
```

Then put the new address in `web/src/lib/config.ts` (`vaultAddress`).

## Security

- Unlock is bound to site origin, chain, wallet, and contract address.
- Unlock session stays in the browser tab until you lock, refresh, or switch wallet.
- Prefer demo or low-risk accounts on testnet.
- Not a formal security audit.

## License

MIT
