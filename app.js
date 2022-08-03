const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const web3 = require("@solana/web3.js");
const { Token,TOKEN_PROGRAM_ID  } = require("@solana/spl-token");

const port = process.env.PORT || 8080;

let mintList = [
  "DbHYyZzeQ6y3ThQEr5FxyVgamiQLETdTtRmJqiLDPC5E",
  "61gGtNdtTHmX5i8W2Q1DoPjfjgsD2vTn3K7KHcfRFVo9",
  "3FiRnyujsmCRhu8aRjqjkGQ8EMWHpdUDFWBe8KosnRr1",
  "HWTuRYpjBcaULc12VMLNgQ3a44DQxWTiZfEHdB4EmVtr",
  "541LCe2qFinGHrWXcp7qgRHzj3fiu51uG54dZqhzmroj",
  "BgpNXomFLHVTVkiKUiy64aFC34yzdbnDzQhYvtgMHwxE",
  "32MTRFd3YSwob5nUoWxpsJ7UrovqESAPrp26PEwKFY8H",
  "DunLPd8P9WFhrkrVJPMonbWHhfKCzmFu5eeKAn8Wubjp",
  "FpqmYfgqqsgvkGUvrnHWDeHyJLVJJ8kfsUGzcZpujNgK",
  "JgHXNky95qqWupS1NiPiuCzz4iuWU1N1fbLpjoFg6ac",
];

const keypair = web3.Keypair.fromSecretKey(
  Uint8Array.from([
    75, 181, 27, 223, 159, 178, 119, 79, 160, 238, 52, 128, 155, 121, 154, 211,
    15, 213, 205, 84, 68, 190, 175, 26, 86, 87, 131, 250, 239, 156, 174, 203,
    92, 144, 97, 171, 245, 168, 102, 251, 203, 92, 101, 249, 100, 157, 156, 146,
    192, 102, 112, 233, 243, 4, 140, 161, 143, 165, 80, 60, 161, 46, 227, 191,
  ])
);

const connection = new web3.Connection(
  "https://metaplex.devnet.rpcpool.com/",
  "confirmed"
);
const app = express();

app.use(cors());
app.options("*", cors());

app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get("/", async (req, res) => res.send("backend is working well"));

app.post("/unpack", async (req, res) => {
  const { address } = req.body;
  const recipient = new web3.PublicKey(address)
  const firstIndex = Math.floor(Math.random() * mintList.length);
  const firstAddress = new web3.PublicKey(mintList[firstIndex]);
  const firstToken = new Token(
    connection,
    firstAddress,
    TOKEN_PROGRAM_ID,
    keypair.payer
  );
  mintList.splice(firstIndex, 1);
  const secondIndex = Math.floor(Math.random() * mintList.length);
  const secondAddress = new web3.PublicKey(mintList[secondIndex]);
  const secondToken = new Token(
    connection,
    secondAddress,
    TOKEN_PROGRAM_ID,
    keypair.payer
  );
  mintList.splice(secondIndex, 1);
  
  const fromTokenAccount1 = await firstToken.getOrCreateAssociatedAccountInfo(
    keypair.publicKey
  );
  const fromTokenAccount2 = await secondToken.getOrCreateAssociatedAccountInfo(
    keypair.publicKey
  );
  
  // Get the derived address of the destination wallet which will hold the custom token
  const associatedDestinationTokenAddr1 = await Token.getAssociatedTokenAddress(
    firstToken.associatedProgramId,
    firstToken.programId,
    firstAddress,
    recipient
  );

  const associatedDestinationTokenAddr2 = await Token.getAssociatedTokenAddress(
    secondToken.associatedProgramId,
    secondToken.programId,
    secondAddress,
    recipient
  );

  const receiverAccount1= await connection.getAccountInfo(associatedDestinationTokenAddr1);
  const receiverAccount2 = await connection.getAccountInfo(associatedDestinationTokenAddr1);
        
  const instructions = [];  
  if (receiverAccount1 === null) {
    instructions.push(
      Token.createAssociatedTokenAccountInstruction(
        firstToken.associatedProgramId,
        firstToken.programId,
        firstAddress,
        associatedDestinationTokenAddr1,
        recipient,
        keypair.publicKey
      )
    )
  }
  if (receiverAccount2 === null) {
    instructions.push(
      Token.createAssociatedTokenAccountInstruction(
        secondToken.associatedProgramId,
        secondToken.programId,
        secondAddress,
        associatedDestinationTokenAddr2,
        recipient,
        keypair.publicKey
      )
    )
  }
  instructions.push(
    Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount1.address,
      associatedDestinationTokenAddr1,
      keypair.publicKey,
      [],
      1
    )
  );
  instructions.push(
    Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      fromTokenAccount2.address,
      associatedDestinationTokenAddr2,
      keypair.publicKey,
      [],
      1
    )
  );

  const transaction = new web3.Transaction();
  transaction.add(...instructions)
  await web3.sendAndConfirmTransaction(connection, transaction, [keypair]);
  res.send("ok");
});

app.listen(port, () => {
  console.log(`picasso server is running at port ${port}`);
});
