const child_process = require('child_process');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bodyparser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyparser.json());

const maxMessagesToSave = 100;

let botVoterInstallDir = "/your/install/directory/here"
let botVoterStarted = false;
let outputStrings = [];
let voterChildProcess = null;

const startVote = () => {
    const command = 'node';
    const args = [`${botVoterInstallDir}run.js`];

    voterChildProcess = child_process.spawn(command, args);

    botVoterStarted = true;
    voterChildProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        outputStrings.push(data.toString());
        outputStrings.slice(-1 * maxMessagesToSave);
    });

    voterChildProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        outputStrings.push(data);
        outputStrings.slice(-1 * maxMessagesToSave);
    });

    voterChildProcess.on('exit', (code, signal) => {
        console.log(`child process exited with code ${code}`);
        voterChildProcess = null;
    });
};

const stopVote = () => {
    if (voterChildProcess === null) {
        return;
    }

    voterChildProcess.kill();
    voterChildProcess = null;
    botVoterStarted = false;
};

const addUser = (userData, settingsFileData) => {
    let foundDuplicate = false;
    for (const user of settingsFileData.users) {
        if (user.discord_displayname === userData.discord_displayname) {
            foundDuplicate = true;
            break;
        }
    }

    if (foundDuplicate) {
        console.log("Duplicate user found. Not added");
        return null;
    }

    settingsFileData.users.push(userData);

    return settingsFileData;
};


const addBot = (botData, settingsFileData) => {
    const foundDuplicate = botData.botName in settingsFileData.bots;

    if (foundDuplicate) {
        console.log("Duplicate bot found. Not added");
        return null;
    }

    settingsFileData.bots[`${botData.botName}`] = botData.botID;

    return settingsFileData;
};

const removeUser = (userData, settingsFileData) => {
    let foundUserIndex = -1;
    let foundUser = false;
    for (const user of settingsFileData.users) {
        foundUserIndex++;
        if (user.discord_displayname === userData.discord_displayname) {
            foundUser = true;
            break;
        }
    }

    if (!foundUser) {
        console.log("Failed to find user. Not removed");
        return null;
    }

    settingsFileData.users.splice(foundUserIndex, 1);
    return settingsFileData;
};

app.get('/log', (req, res) => {

    //console.log("Ran GET for /log")

    const { lastSeenIndex } = req.headers;

    const logsToReturn = outputStrings.slice(lastSeenIndex);
    const response = { result: logsToReturn };
    res.status(200).json(response);
    return;
  });

app.get('/users', (req, res) => {
    console.log("Ran GET for /users")
    const data = fs.readFileSync(`${botVoterInstallDir}data/config.json`);

    const jsonData = JSON.parse(data);

    const response = { result: jsonData.users }; 
    res.json(response);

    return;
});

app.post('/users', (req, res) => {
    console.log("Ran POST for /users")

    const { userData, mode } = req.body;

    const data = fs.readFileSync(`${botVoterInstallDir}data/config.json`);
    const settingsDataJson = JSON.parse(data);

    if (mode !== 'add' && mode !== 'remove') {
        const response = { result: `bad mode: ${mode}` };
        res.status(400).json(response);
        return;
    }

    let resultJson;
    if (mode === 'add') {
        resultJson = addUser(userData, settingsDataJson);
    } else if (mode === 'remove') {
        resultJson = removeUser(userData, settingsDataJson);
    }

    if (resultJson == null) {
        console.log("Warn: Failed to change JSON settings.");
        res.status(400).json("Bad Request");
        return;
    }

    fs.writeFile(`${botVoterInstallDir}data/config.json`, JSON.stringify(resultJson), (err) => {
        if (err) throw err;
        console.log('JSON data written to file');
    });

    res.status(201).json(resultJson);
    return;
});

app.get('/bots', (req, res) => {
    console.log("Ran GET for /bots")
    const data = fs.readFileSync(`${botVoterInstallDir}data/config.json`);

    const jsonData = JSON.parse(data);

    const response = { result: jsonData.bots }; 
    res.status(200).json(response);

    return;
});

app.post('/bots', (req, res) => {
    console.log("Ran POST for /bots")

    console.log(req.body);

    const { botName, botID } = req.body;

    const data = fs.readFileSync(`${botVoterInstallDir}data/config.json`);
    const settingsDataJson = JSON.parse(data);

    let resultJson = addBot({botName: botName, botID: botID}, settingsDataJson);

    if (resultJson == null) {
        throw Error("Failed to change JSON settings.");
    }

    fs.writeFile(`${botVoterInstallDir}data/config.json`, JSON.stringify(resultJson), (err) => {
        if (err) throw err;
        console.log('JSON data written to file');
    });

    res.status(201).send('Added successfully');
    return;
});


app.post('/control', (req, res) => {
    const { mode } = req.body;

    switch (mode) {
        case 'start':
            startVote();
            res.status(200).send("Voter start signal recieved");
            break;
        case 'stop':
            stopVote();
            res.status(200).send("Voter signal recieved");
            break;
        case 'status':
            res.status(200).send(botVoterStarted ? "RUNNING" : "STOPPED");
            break;
        default:
            const response = "bad request";
            res.status(400).send(response);
            return;
    }

    return;
  });


app.listen(40169, () => {
    console.log('Server is running on port 40169');
});

