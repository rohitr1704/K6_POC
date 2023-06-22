import http from 'k6/http';
import {sleep} from 'k6';
import {check} from 'k6';
import { group } from 'k6';
import { Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { findBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Parameterization using json data file
const loginDetails = new SharedArray('loginDetails', function () {
    return JSON.parse(open('./loginDetails.json')).users;
  });

// VUser Init block to execute only once
export function setup() {

  
    const loginUrl='http://gcp-rep-seller.services.ajio.jio.com/hawkeye/v1/login';
    
    const loginPaylod=JSON.stringify(
        {
            'username': loginDetails[0].username,
            'password': loginDetails[0].password,
            }

    )

    const loginParams={
        headers:{
            'Content-Type': 'application/json',
        }
    }

    const loginResponse= http.post(loginUrl,loginPaylod,loginParams);


    const token = findBetween(loginResponse.body,'"accessToken":"','","refreshToken');
    console.log("Token >>>>>>>>>>>",token);
    return token;


  }

// Vuser action block to iterate
    export default function (token)
    { 
        let transId;
        let params;

        group('T02_SendMobOTP', function () {

        const sendotp_url = 'http://gcp-rep-seller.services.ajio.jio.com/doorman/v1/send-otp';
            
        const sendotp_payload=JSON.stringify(
            {
                'clientId' : 'SellerOnBoardMicroservice',
                'mobileNumber' : '9058239101',
                'tag': 'preregister',
            });

        params = {
            headers:
            {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token + '',
            }
    };

    const sendotp_res = http.post(sendotp_url,sendotp_payload,params);

    console.log("Send OTP Response >>>>>>>>>>>",sendotp_res);

    transId = findBetween(sendotp_res.body,'"transactionId":"','"');

    console.log("TransactionId >>>>>>>>>>>",transId);

    check(sendotp_res,{
        'is status 200' : (r) => r.status == 200,
        'is res body' : (r) => r.body.includes('OTP successfully Sent'),
    });

    });

    sleep(5);

    group('T03_ResendMobOTP', function () {

    const resendotp_url = 'http://gcp-rep-seller.services.ajio.jio.com/doorman/v1/resend-otp';

    const resendotp_payload=JSON.stringify(
        { 
         "transactionId": transId
         }
     ); 

    const resendotp_res = http.post(resendotp_url,resendotp_payload,params);

    check(resendotp_res,{
        'is status 200' : (r) => r.status == 200,
        'is res body' : (r) => r.body.includes('OTP successfully resent'),
    });

    

    console.log("Resend OTP Response >>>>>>>>>>>",resendotp_res);

});

}

// Scenario Design
export const options={

    stages: [
        { target: 1, duration: '1s' }, // ramp-up
        { target: 1, duration: '30s' }, // steady-state
        { target: 0, duration: '1s' } // ramp-down
      ]

}