/* *
 * The skeleton for the code is provided by Amazon.
 * Please visit https://developer.amazon.com/en-US/docs/alexa/workshops/build-an-engaging-skill/get-started/index.html
 * for additional information.
 * */
 
const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    
    // Code to retrieve user's name and email
    // See: https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/call-alexa-service-apis.html
    
    async handle(handlerInput) {
    
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    const consentToken = requestEnvelope.context.System.user.permissions &&
      requestEnvelope.context.System.user.permissions.consentToken;
      
    if (!consentToken) {
      return handlerInput.responseBuilder
        .speak('Please provide name and email permissions in your Amazon Alexa App!')
        .withAskForPermissionsConsentCard(['alexa::profile:name:read', "alexa::profile:email:read" ])
        .getResponse();
    }

    let {deviceId} = requestEnvelope.context.System.device;
    const upsServiceClient = serviceClientFactory.getUpsServiceClient();
    const email = await upsServiceClient.getProfileEmail();
    var name = await upsServiceClient.getProfileName();
    
     var userTimeZone, greeting;

    // wrap the API call in a try/catch block in case the call fails for
    // whatever reason.
    try {
        userTimeZone = await upsServiceClient.getSystemTimeZone(deviceId);
    } catch (error) {
        userTimeZone = "error";
        console.log('error', error.message);
    }
    if(userTimeZone === "error"){
        var currentDateTime = 0;
        var currentDate = 0;
        var currentYear = 0;
    }
    else {
        // getting the current date with the time
        currentDateTime = new Date(new Date().toLocaleString("en-UK", {timeZone: userTimeZone}));
    }

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
    var speakOutput = `Hi, I'm Alexa, I'm an intelligent voice assistant and I can do many things. I can play music, tell jokes, and even read the news! I listen out for my name and can respond to it.
    If you interact with me, I may record what you say.`;
    
    // Increase the number of visits of the user
    // Save name and email as sessionAttributes
    sessionAttributes.visits += 1;
    sessionAttributes.name = name;
    sessionAttributes.email = email;
    sessionAttributes.lastVisit = `${currentDateTime}`;
    sessionAttributes.allVisits += `, ${currentDateTime}`;
    
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    }
};

/**
 * Template code for ending a session, provided by Amazon in custom template.
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
 
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};


/**
 * Template code for Error handling, provided by Amazon in custom template.
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
 
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * Using attributes to ensure the skill remembers the number of visits,
 * the user's name and the user's email.
 * Template code provided by Amazon in the tutorial mentioned at the top of this file. 
*/

const LoadDataInterceptor = {
    async process(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // get persistent attributes, using await to ensure the data has been returned before
        // continuing execution
        var persistent = await handlerInput.attributesManager.getPersistentAttributes();
        if(!persistent) persistent = {};
        
        sessionAttributes.name = (persistent.hasOwnProperty('name')) ? persistent.name : '';
        sessionAttributes.email = (persistent.hasOwnProperty('email')) ? persistent.email : '';
        sessionAttributes.visits = (persistent.hasOwnProperty('visits')) ? persistent.visits : 0;
        sessionAttributes.lastVisit = (persistent.hasOwnProperty('lastVisit')) ? persistent.lastVisit : '';
        sessionAttributes.allVisits =  (persistent.hasOwnProperty('allVisits')) ?persistent.allVisits : '';


        //set the session attributes so they're available to your handlers
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    }
};
// This request interceptor will log all incoming requests of this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log('----- REQUEST -----');
        console.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
    }
};

// Response Interceptors run after all skill handlers complete, before the response is
// sent to the Alexa servers.
const SaveDataInterceptor = {
    async process(handlerInput) {
        const persistent = {};
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        persistent.visits = sessionAttributes.visits;
        persistent.name = sessionAttributes.name;
        persistent.email = sessionAttributes.email;
        persistent.lastVisit = sessionAttributes.lastVisit;
        persistent.allVisits = sessionAttributes.allVisits;


        // set and then save the persistent attributes
        handlerInput.attributesManager.setPersistentAttributes(persistent);
        let waiter = await handlerInput.attributesManager.savePersistentAttributes();
    }
};
// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
        console.log('----- RESPONSE -----');
        console.log(JSON.stringify(response, null, 2));
    }
};

// Entry point for skill. 
 
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        SessionEndedRequestHandler)
    .addRequestInterceptors(
        LoadDataInterceptor,
        LoggingRequestInterceptor
    )
    .addResponseInterceptors(
        SaveDataInterceptor,
        LoggingResponseInterceptor
    )
    .addErrorHandlers(
        ErrorHandler)
    .withPersistenceAdapter(
    new ddbAdapter.DynamoDbPersistenceAdapter({
        tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
        createTable: false,
        dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
    })
)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();