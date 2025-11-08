import * as fs from "fs";
import * as path from "path";
import type { P2pTokenEscrow } from "../p2p-escrow-dapp/p2p-token-escrow/target/types/p2p_token_escrow.ts"
import escrowIdl from "../p2p-escrow-dapp/p2p-token-escrow/target/idl/p2p_token_escrow.json";
import { createUmi} from "@metaplex-foundation/umi-bundle-defaults";
import { createGenericFile, createSignerFromKeypair, generateSigner, percentAmount, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata, TokenStandard, transferV1 } from "@metaplex-foundation/mpl-token-metadata";
import { homedir } from "os";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

const main = async() => {

  const escrowID = publicKey((escrowIdl as P2pTokenEscrow).address);
  const mint = publicKey("J3mHJBUwiRHRwTuavqBw97xCJTySD8fszLAYQGzQwE9s");
  const destination = publicKey("aLiwgDkULgpCfJ5wSYsLGGN3x4Ldg63LC6YaeDQwFqG");
  const umi = createUmi('https://api.devnet.solana.com');

  const keypair = umi.eddsa.createKeypairFromSecretKey( 
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(homedir() + "/.config/solana/bob.json", "utf8").toString()
      )
    )
  );

  const signer = createSignerFromKeypair(umi, keypair);

  // Register the signer to Umi, this also sets the payer
  umi.use(signerIdentity(signer));

  // Registers different plugins we want to use
  umi
    .use(mplTokenMetadata())
    .use(irysUploader());

  const tx = await transferV1(umi, {
    authority: signer,
    payer: signer,
    mint,
    destinationOwner: destination,
    tokenStandard: TokenStandard.NonFungible,
  }).sendAndConfirm(umi);

  console.log("https://solscan.io/tx/" + bs58.encode(tx.signature) + "?cluster=devnet")
}

try { main(); }
catch (e) { console.error(e); }
