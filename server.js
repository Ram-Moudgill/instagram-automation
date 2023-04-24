const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const app = express();
const port = 4000;
const path = require("path");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const CLIENT_ID =
  "555559695118-db7hd273bd2f41555t3f9e64t7oimuhi.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:3000";
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
app.use(cors());
const upload = multer({ dest: "uploads/" });
app.use(bodyParser.json());
const { IgApiClient } = require("instagram-private-api");
const { postUpload } = require("./postupload");
const { reelsUpload } = require("./reelupload");

const cron = require("node-cron");
const runApiForUser = (ig, user, type, cronTask) => {
  try {
    console.log(type);
    console.log("post uploading");
    postUpload(ig, user, cronTask);
    // reelsUpload(ig, user);
  } catch (error) {
    console.log(error);
  }
};

const startCronJobs = async () => {
  const users = fs.readFileSync("./Config/users.json", {
    encoding: "utf8",
    flag: "r",
  });
  const userData = JSON.parse(users);

  const userCrons = [];

  for (const user of userData) {
    try {
      const ig = new IgApiClient();
      ig.state.generateDevice(user.username);
      await ig.account.login(user.username, user.password);
      console.log(`${user.username} logged in successfully`);

      userCrons.push(
        {
          type: "cronForStories",
          value: user.cronForStories,
          ig: ig,
          user: user,
        },
        {
          type: "cronForReels",
          value: user.cronForReels,
          ig: ig,
          user: user,
        },
        {
          type: "cronForPosts",
          value: user.cronForPosts,
          ig: ig,
          user: user,
        }
      );
    } catch (error) {
      console.log(`login failed ${user.username}`);
    }
  }
  const minutes = [...Array(25).keys()].slice(1); // minutes from 1 to 59
  let currentIndex = 0; // current index in the hours array
  const runCronJob = (value, type, ig, user) => {
    const getRandomMinute = () =>
      minutes[Math.floor(Math.random() * minutes.length)];
    for (let i = currentIndex; i < value.length; i++) {
      const hour = value[i];
      const cronExpression = `${getRandomMinute()} ${hour} * * *`;
      console.log(cronExpression);
      const cronTask = cron.schedule(
        "37 22 * * *",
        () => {
          runApiForUser(ig, user, type, cronTask);
        },
        {
          scheduled: true,
          timezone: "Asia/Kolkata",
        }
      );
    }
  };

  for (const item of userCrons) {
    runCronJob(item.value, item.type, item.ig, item.user);
  }
};

cron.schedule(
  "0 0 * * *",
  () => {
    startCronJobs();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);
startCronJobs();
async function getAccessToken(code) {
  const options = {
    code: code,
    grant_type: "authorization_code",
    access_type: "offline",
    expiry_date: Date.now() + 604800 * 1000,
  };
  const { tokens } = await client.getToken(options);
  return tokens;
}
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.get("/fetch-instagram-user", (req, res) => {
  const users = fs.readFileSync("./Config/users.json", {
    encoding: "utf8",
    flag: "r",
  });
  res.json(JSON.parse(users));
});
app.get("/fetch-instagram-user-data/:id", async (req, res) => {
  try {
    let captionFile = fs.readFileSync(
      `./Config/${req.params.id}-captions.json`,
      {
        encoding: "utf8",
        flag: "r",
      }
    );
    let tagsFile = fs.readFileSync(`./Config/${req.params.id}-tags.json`, {
      encoding: "utf8",
      flag: "r",
    });
    const users = fs.readFileSync("./Config/users.json", {
      encoding: "utf8",
      flag: "r",
    });
    let user = JSON.parse(users).find((i) => i.username === req.params.id);
    let responseData = {
      user: user,

      captionFile: JSON.parse(captionFile),
      tagsFile: JSON.parse(tagsFile),
    };
    // console.log(responseData);
    res.json(responseData);
    // res.send(req.params.id);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
app.post("/add-instagram-user", async (req, res) => {
  const newUser = req.body;
  const code = req.body.code;
  const tokens = await getAccessToken(code);
  newUser.tokens = tokens;
  await fs.promises.writeFile(
    `./Config/${newUser.username}-captions.json`,
    JSON.stringify(req.body.captionsData)
  );

  await fs.promises.writeFile(
    `./Config/${newUser.username}-tags.json`,
    JSON.stringify(req.body.tagsData)
  );
  const existingUsers = fs.existsSync("./Config/users.json")
    ? JSON.parse(fs.readFileSync("./Config/users.json"))
    : [];
  delete newUser.tagsData;
  delete newUser.captionsData;
  existingUsers.push(newUser);
  fs.writeFileSync("./Config/users.json", JSON.stringify(existingUsers));

  res.send("User added!");
});
app.post("/upload", upload.array("images"), async (req, res) => {
  try {
    const { username } = req.body;
    const users = fs.readFileSync("./Config/users.json", {
      encoding: "utf8",
      flag: "r",
    });
    let user = JSON.parse(users).find((i) => i.username === username);
    const files = req.files;
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: user.tokens.refresh_token });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const promises = files.map((file) => {
      const filePath = path.join(file.destination, file.filename);
      return drive.files
        .create({
          requestBody: {
            name: file.originalname,
            mimeType: file.mimetype,
            parents: [user.folderId],
          },
          media: {
            mimeType: file.mimetype,
            body: fs.createReadStream(filePath),
          },
        })
        .then(() => {
          // Delete the uploaded file from the local file system
          fs.unlink(filePath, (err) => {
            if (err) throw err;
            console.log(`Deleted file: ${filePath}`);
          });
        });
    });
    const response = await Promise.all(promises);
    res.status(200).send({
      success: true,
      message: "Files uploaded successfully.",
      username,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: "Error uploading files." });
  }
});
app.post("/videos-upload", upload.array("videos"), async (req, res) => {
  try {
    console.log(req.body);
    const { username } = req.body;
    const users = fs.readFileSync("./Config/users.json", {
      encoding: "utf8",
      flag: "r",
    });
    let user = JSON.parse(users).find((i) => i.username === username);
    const files = req.files;
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: user.tokens.refresh_token });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const promises = files.map((file) => {
      const filePath = path.join(file.destination, file.filename);
      return drive.files
        .create({
          requestBody: {
            name: file.originalname,
            mimeType: file.mimetype,
            parents: [user.videoFolderId],
          },
          media: {
            mimeType: file.mimetype,
            body: fs.createReadStream(filePath),
          },
        })
        .then(() => {
          // Delete the uploaded file from the local file system
          fs.unlink(filePath, (err) => {
            if (err) throw err;
            console.log(`Deleted file: ${filePath}`);
          });
        });
    });
    const response = await Promise.all(promises);
    res.status(200).send({
      success: true,
      message: "Videos uploaded successfully.",
      username,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Error uploading videos." });
  }
});

app.listen(port, () => {
  console.log(`Server listening `);
});
