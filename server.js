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

const cron = require("node-cron");
const runApiForUser = (ig, user) => {
  try {
    postUpload(ig, user);
  } catch (error) {
    console.log(error);
  }
};

let cronJobs = [];
const startCronJobs = async () => {
  const users = fs.readFileSync("./Config/users.json", {
    encoding: "utf8",
    flag: "r",
  });
  for (const user of JSON.parse(users)) {
    try {
      const ig = new IgApiClient();
      ig.state.generateDevice(user.username);
      await ig.account.login(user.username, user.password);
      console.log(user.username + " logged in successfully");

      const cronJob = cron.schedule(user.cron, async () => {
        runApiForUser(ig, user);
      });
      cronJobs.push(cronJob);
    } catch (error) {
      console.error(user.username + " failed to log in: " + error.message);
    }
  }
  console.log("cron jobs started");
};

const stopCropJobs = () => {
  cronJobs.map((item) => {
    item.stop();
  });
  console.log("cron jobs stopped");
};
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
app.get('/', (req, res) => {
  res.send('Hello, world!');
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
  stopCropJobs();
  startCronJobs();
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

app.listen(port, () => {
  console.log(`Server listening `);
});
