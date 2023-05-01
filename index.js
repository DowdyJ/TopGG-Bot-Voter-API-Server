
const express = require('express');
const cors = require('cors');
const fs = require('fs');



const app = express();
app.use(cors());

let botVoterInstallDir = "/home/dowdyj/Documents/Programming/TopGG-Bot-Voter/"
let botVoterOpen = false;
let outputStrings = [];

const startVote = () => {
    const command = 'node';
    const args = [`${botVoterInstallDir}run.js`];

    const childProcess = spawn(command, args);
    botVoterOpen = true;

    childProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        outputStrings.push(data);
    });

    childProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        outputStrings.push(data);
    });

    childProcess.on('close', (code) => {
        botVoterOpen = false;
        console.log(`child process exited with code ${code}`);
    });
};
    //"discord_displayname":"DoeJ",
    //"discord_username":"johndoe@example.com",
    //"discord_password":"password",
    //"bots_to_vote_for": []

const addUser = (userData, settingsFileData) => {
    const foundDuplicate = false;
    for (const user of settingsFileData.users) {
        if (user.discord_username === userData.discord_username) {
            foundDuplicate = true;
            break;
        }
    }

    if (foundDuplicate) {
        console.log("Duplicate user found. Not added");
        return null;
    }

    settingsFileData.users.push(userData);
};

const removeUser = (userData, settingsFileData) => {
    const foundUserIndex = -1;
    const foundUser = false;
    for (const user of settingsFileData.users) {
        foundUserIndex++;
        if (user.discord_username === userData.discord_username) {
            foundUser = true;
            break;
        }
    }

    if (!foundUser) {
        console.log("Failed to find user. Not removed");
        return null;
    }

    return settingsFileData.users.splice(foundUserIndex, 1);
};

app.get('/log', (req, res) => {

    console.log("Ran GET for /log")

    const { lastSeenIndex } = req.headers;

    const logsToReturn = outputStrings.slice(lastSeenIndex);
    const response = { result: logsToReturn };
    res.json(response);
    return;
  });

app.get('/users', (req, res) => {
    console.log("Ran GET for /users")
    const data = fs.readFileSync(`${botVoterInstallDir}data/config.json`);

    const jsonData = JSON.parse(data);

    const response = { result: jsonData.users }; 
    res.json(response);

    console.log(response);
    return;
});

app.post('/users', (req, res) => {
    console.log("Ran POST for /users")

    const { userData, mode } = req.body;

    const data = fs.readFileSync(`${botVoterInstallDir}data/config.json`);
    const settingsDataJson = JSON.parse(data);
    const userDataJson = JSON.parse(userData);

    if (mode !== 'add' && mode !== 'remove') {
        const response = { result: `bad mode: ${mode}` };
        res.status(400).json(response);
        return;
    }

    let resultJson;
    if (mode === 'add') {
        resultJson = addUser(userDataJson, settingsDataJson);
    } else if (mode === 'remove') {
        resultJson = removeUser(userDataJson, settingsDataJson);
    }

    if (resultJson == null) {
        throw Error("Failed to change JSON settings.");
    }

    fs.writeFile(`${botVoterInstallDir}data/config.json`, JSON.stringify(resultJson), (err) => {
        if (err) throw err;
        console.log('JSON data written to file');
    });

    res.json(resultJson);
    return;
});




app.post('/control', (req, res) => {
    const { mode } = req.body;

    switch (mode) {
        case 'start':

            break;
        case 'stop':
    
            break;
        default:
            const response = { result: "bad request" };
            res.status(400).json(response);
            return;
    }

    const response = { result: "success" };
    res.status(201).json(response);
    return;
  });


app.listen(40169, () => {
    console.log('Server is running on port 40169');
});

