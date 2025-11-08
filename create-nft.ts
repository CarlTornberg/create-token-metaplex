import * as fs from "fs";
import * as path from "path";
import type { P2pTokenEscrow } from "../p2p-escrow-dapp/p2p-token-escrow/target/types/p2p_token_escrow.ts"
import escrowIdl from "../p2p-escrow-dapp/p2p-token-escrow/target/idl/p2p_token_escrow.json";
import { createUmi} from "@metaplex-foundation/umi-bundle-defaults";
import { createGenericFile, createSignerFromKeypair, generateSigner, percentAmount, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { homedir } from "os";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";


const main = async() => {
  
  const escrowID = publicKey((escrowIdl as P2pTokenEscrow).address);
  const mint = Keypair.generate();
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

  //const allProgramAccounts = await umi.rpc.getProgramAccounts(escrowID);
  //console.log(allProgramAccounts);
  
  const filePath = path.join(__dirname, '/assets/VaultToken.png');
  const imgBuffer = fs.readFileSync(filePath);
  const umiImgFile = createGenericFile(imgBuffer, "umi-file.png", { 
    tags: [
      { name: "Content-Type", value: "image/png" } 
    ]});

  const [imgUri] = await umi.uploader.upload([umiImgFile]);
  console.log("Uploaded image to " + imgUri);

  const metadata = {
    name: "Time Vault Token",
    symbol: "TVT",
    description: "Bob",
    image: imgUri,
    external_url: "https://google.com/",
    attributes: [
      {
        trait_type: "trait1",
        value: "value1",
      }
    ],
    properties: {
      files: [ {
        uri: imgUri,
        type: "image/png"
      }
      ],
      category: "image"
    }
  };

  const metadataUri = await umi.uploader.uploadJson(metadata);
  console.log("Uploaded JSON to " + metadataUri);

  const asset = generateSigner(umi);

  const tx = await createNft(umi, {
    mint: asset,
    payer: signer, 
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    authority: signer,
    updateAuthority: signer,
  }).sendAndConfirm(umi);

    console.log("Created NFT {} at tx https://solscan.io/tx/{}?cluster=devnet", asset.publicKey, bs58.encode(tx.signature));

}

main().catch();
