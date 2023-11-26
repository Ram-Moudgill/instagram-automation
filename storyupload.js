const { google } = require("googleapis");
const { get } = require("request-promise");
const { DateTime, Duration } = require("luxon");
const fs = require("fs");
// const { StickerBuilder } = require("instagram-private-api");
const {
  StickerBuilder,
} = require("instagram-private-api/dist/sticker-builder");
const storyUpload = async (ig, user, cronJob) => {
  try {
    const CLIENT_ID =
      "555559695118-db7hd273bd2f41555t3f9e64t7oimuhi.apps.googleusercontent.com";
    const CLIENT_SECRET = "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";
    const REDIRECT_URI = "http://localhost:3000";
    const REFRESH_TOKEN = user.tokens.refresh_token;
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });
    async function getImage() {
      const folderId = user.storyFolderId;
      const res = await drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 1,
        fields: "nextPageToken, files(id, name, webContentLink)",
      });
      if (res.data.files.length > 0) {
        const file = res.data.files[0];
        const response = await drive.files.get(
          { fileId: file.id, alt: "media" },
          { responseType: "arraybuffer" }
        );
        const imageBuffer = Buffer.from(response.data);
        // console.log(imageBuffer);
        fileId = file.id;

        // const imageBuffer = await fs.readFileSync(imagePath);

        await ig.publish.story({
          file: imageBuffer,
          stickerConfig: new StickerBuilder()
            // these are all supported stickers
            .add(
              StickerBuilder.hashtag({
                tagName: "insta",
              }).center()
            )
            .add(
              StickerBuilder.mention({
                userId: ig.state.cookieUserId,
              }).center()
            )
            .add(
              StickerBuilder.question({
                question: "My Question",
              }).scale(0.5)
            )
            .add(
              StickerBuilder.question({
                question: "Music?",
                questionType: "music",
              })
            )
            // .add(
            //   StickerBuilder.countdown({
            //     text: "My Countdown",
            //     // @ts-ignore
            //     endTs: DateTime.local().plus(Duration.fromObject({ hours: 1 })), // countdown finishes in 1h
            //   })
            // )
            .add(
              StickerBuilder.chat({
                text: "Chat name",
              })
            )
            // .add(
            //   StickerBuilder.location({
            //     locationId: (
            //       await ig.locationSearch.index(13, 37)
            //     ).venues[0].external_id,
            //   })
            // )
            // .add(
            //   StickerBuilder.poll({
            //     question: "Question",
            //     tallies: [{ text: "Left" }, { text: "Right" }],
            //   })
            // )
            .add(
              StickerBuilder.quiz({
                question: "Question",
                options: ["0", "1", "2", "3"],
                correctAnswer: 1,
              })
            )
            .add(
              StickerBuilder.slider({
                question: "Question",
                emoji: "❤",
              })
            )

            // mention the first story item
            // .add(
            //   StickerBuilder.mentionReel(
            //     (
            //       await ig.feed.userStory("username").items()
            //     )[0]
            //   ).center()
            // )

            // mention the first media on your timeline
            // .add(
            //   StickerBuilder.attachmentFromMedia(
            //     (
            //       await ig.feed.timeline().items()
            //     )[0]
            //   ).center()
            // )

            // you can also set different values for the position and dimensions
            .add(
              StickerBuilder.hashtag({
                tagName: "insta",
                width: 0.5,
                height: 0.5,
                x: 0.5,
                y: 0.5,
              })
            )
            .build(),
        });
      } else {
        console.log("No files found.");
      }
    }
    getImage();
  } catch (error) {
    console.error(error);
  }
};

module.exports = { storyUpload };
