const {
  StickerBuilder,
} = require("instagram-private-api/dist/sticker-builder");
const { IgApiClient } = require("instagram-private-api");
const fs = require("fs/promises");

const storyUpload = async () => {
  try {
    const ig = new IgApiClient();
    ig.state.generateDevice("ggurjit40");

    // Log in
    const auth = await ig.account.login("ggurjit40", "ggurjit33");
    console.log("Logged in as:", auth.username);

    // Replace the following path with the actual path to your local image file
    const imagePath = "./uploads/file.jpg";

    const imageBuffer = await fs.readFile(imagePath);

    // Upload story
    await ig.publish.story({
      file: imageBuffer,
      stickerConfig: new StickerBuilder()
        .add(
          StickerBuilder.question({
            question: "Music?",
            questionType: "music",
          })
        )
        .build(),
    });
  } catch (error) {
    console.error(error);
  }
};

storyUpload();
