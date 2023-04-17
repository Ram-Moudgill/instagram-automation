const { IgApiClient } = require("instagram-private-api");
const { readFile } = require("fs").promises;

async function uploadReel() {
  // 1. Create a new `IgApiClient` instance and log in
  const ig = new IgApiClient();
  ig.state.generateDevice("your-username");
  await ig.account.login("your-username", "your-password");

  // 2. Read the file containing the reel you want to upload
  const videoBuffer = await readFile("path/to/reel.mp4");

  // 3. Upload the reel
  const publishResult = await ig.publish.reel({
    video: videoBuffer,
    caption: "Your caption here",
  });

  console.log(`Reel uploaded: ${publishResult.media.code}`);
}

uploadReel().catch(console.error);
