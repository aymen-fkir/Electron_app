const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { ChatOpenAI } = require("@langchain/openai");
const {ChatPromptTemplate} = require("@langchain/core/prompts");
const { ipcMain,app, BrowserWindow } = require('electron');


const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATHS = {"aymenfkir23@gmail.com":path.join(__dirname,"tokens","token.json"),"aymenfkir@gmail.com":path.join(__dirname,"tokens","token2.json")}
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const env = require('dotenv').config();
var api_key = env.parsed["api_key"]



// error handeling
async function classify(snippet) {
  const chatModel = new ChatOpenAI({openAIApiKey:api_key})
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "i want you to classify these emails snippet either as work or eduction or others \
    where work represent an email that contain professional stuff like internsheep,job offer or important meeting\
    , and education represent any thing related to courses or teachers emails \
    and for any thing left is considered as others \
    your responce chould consiste of the class off the email nothing else."],
    ["user", "{input}"],
  ]);
  const chain = prompt.pipe(chatModel);
  const responce = await chain.invoke({input:snippet})
  return responce["content"]

}


async function loadSavedCredentialsIfExist(TOKEN_PATH) {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}


async function saveCredentials(client,TOKEN_PATH) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}


async function authorize(TOKEN_PATH) {
  
  let client = await loadSavedCredentialsIfExist(TOKEN_PATH);
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client,TOKEN_PATH);
  }
  return client;
}

function GetMessages(email){
  try{
    const obj = {"text/plain":[],"text/html":[],"image/jpeg":[],"application/pdf":[]}
    const parts = "parts" in email.data.payload? email.data.payload.parts : [email.data.payload]
    for (const part of parts){
      obj[part.mimeType].push(Buffer.from(part.body.data,"base64url").toString("ascii"))
    }

    return obj
  } catch(error){
    console.log(error)
    return null
  }
    
}

// try to optimise it later
function Getreciever(emailData){
  const reciver = emailData.data.payload.headers.find(
    (header) => header.name === "To"
  )?.value
  if (reciver.includes("aymenfkir23@gmail.com")){
      return "aymenfkir23@gmail.com"
  }else{
    return "aymenfkir@gmail.com"
  }
}


async function ListUnreadMails(auth) {
  const service = google.gmail({ version: 'v1', auth });
    const res =  await service.users.messages.list({
      userId: 'me',
      maxResults: 5,
      q: "is:unread",
    }).then((res) => {
       
      return res}
    ).catch((err)=>{
      
      return err}
    );
    const messageIds = res.data.messages.map((message) => message.id);

    const emailPromises = messageIds.map( async(id) => {
      const emailData = await service.users.messages.get({
        userId: "me",
        id:id,
      }).then((res)=> {return res}).catch((err)=>{console.log(err)
      return null})
      if(emailData==null){
        return {}
      }
      return {
        Id:emailData.data.id,
        From: emailData.data.payload.headers.find(
          (header) => header.name === "From"
        )?.value,
        To:Getreciever(emailData),
        Subject: emailData.data.payload.headers.find(
          (header) => header.name === "Subject"
        )?.value,
        Data:  [GetMessages(emailData)],
        Tag: await classify(emailData.data.snippet),
      };
    });

    const resolvedEmails = await Promise.all(emailPromises);
    return resolvedEmails; 
}

async function Get(){
  try {
    const user1cred = await authorize(TOKEN_PATHS["aymenfkir23@gmail.com"])
    const user2cred = await authorize(TOKEN_PATHS["aymenfkir@gmail.com"])
    const user1Emails = await ListUnreadMails(user1cred)
    const user2Emails = await ListUnreadMails(user2cred)
    return [user1Emails,user2Emails];
  } catch (error) {

    console.error("Error occurred in 'getemails' handler:", error);
    return [];
  }
};


function creatwindow(){
  const win = new BrowserWindow({
    width:1000,
    height:600,
    center:true,
    resizable:false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  

  
  win.loadFile(path.join(__dirname,"front","index.html"))
  
}



app.whenReady().then(() => {
  creatwindow()
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  
})

ipcMain.handle("Relode",Get)





