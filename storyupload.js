const { IgApiClient } = require("instagram-private-api");
const { readFile } = require("fs").promises;

async function uploadStory() {
  // 1. Create a new `IgApiClient` instance and log in
  const ig = new IgApiClient();
  ig.state.generateDevice("your-username");
  await ig.account.login("your-username", "your-password");

  // 2. Read the file containing the story you want to upload
  const photoBuffer = await readFile("path/to/story.jpg");

  // 3. Upload the story
  const publishResult = await ig.publish.story({
    file: photoBuffer,
    caption: "Your caption here",
  });

  console.log(`Story uploaded: ${publishResult.media.code}`);
}

uploadStory().catch(console.error);
