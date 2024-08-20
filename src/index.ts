import AWS from "aws-sdk";
import { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, newTemplate, template } from "./constants";
import {Pool} from "pg";
import parse from "csv-parser";
import fs from "fs";
import { Readable } from 'stream';
AWS.config.update({ region: AWS_REGION });

const s3 = new AWS.S3({
    apiVersion: "latest",
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

// PostgreSQL client setup
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'mysecretpassword',
    port: 5436,
  });

const Key = "clzu3bi0b0001wdaivljii2kz/input.csv";


const createTabe = async(columnDefs:string)=>{
    const createTable = `CREATE TABLE user_table (${columnDefs})`;
    const createRes = await pool.query(createTable);
    return createRes;
}

const insertData = async(results:any[],keys:string[]) => {

    const key = keys.join(", ");

    const queries = results.map((content) => {
        const values = Object.values(content).map(val => `'${val}'`).join(", ");
        return `INSERT into user_table (${key}) VALUES (${values})`;
    });

    for (const query of queries){
        const res = await pool.query(query);
        console.log("THE RES WHILE CREATING THE DATA : ");
        console.log(res);
    }
}

const getData = async () => {
    const query = 'SELECT * FROM user_table WHERE video_id = $1';
    const result = await pool.query(query,[5]);
    console.log("The result from DB is : ");
    console.log(result);
}

function main(){
    s3.getObject({Bucket:"datavidhya-revamp",Key},async (err,data)=>{
        if(err){
            console.log("The error is : "),
            console.log(err);
        }
        else{
            const fileContent = data?.Body?.toString() as string;
            console.log("The content is : ");
            console.log(fileContent);
            const results:any = [];
    
            const streamContent = Readable.from(fileContent);
    
             // Parse CSV file
            const pr:any = await new Promise((resolve,rej)=>{
                streamContent
                .pipe(parse())
                .on('data', (data) => {
                    results.push(data);
                    resolve(results);
                })
                .on('end', async () => {
                    if (results.length === 0) {
                        console.log("CSV IS EMPTY");
                    }
                })
                .on('error',async(error)=>{
                    rej(error);
                })
            })  
            
            const keys = Object.keys(pr[0]);

           
            // const columnDefs = keys.map(key => `${key} TEXT`).join(", ");

            // const createRes = await createTabe(columnDefs);
            //  await insertData(results, keys);

            await getData();


            
        }
    })
}

// main();

async function getResult(){
    const JUDGE0_API = "http://localhost:2358"
    const api = JUDGE0_API+"/submissions/?base64_encoded=false&wait=false"

    const res = await fetch(api,{
        method:"POST",
        headers:{
            "Content-type":"application/json"
        },
        body:JSON.stringify({
            "source_code": template,
            "language_id": 71,
        })
    })

    const data = await res.json();
    console.log("THE SUBMISSION RESULT IS : ");
    console.log(data);
    return data.token;
}

const getFinalResult = async (token:string) => {
    const JUDGE0_API = "http://localhost:2358"
    const api = JUDGE0_API+`/submissions/${token}?base64_encoded=false&fields=*`;

    const res = await fetch(api);
    const data = await res.json();
    console.log("THE FINAL RESULT IS : ");
    console.log(data);
}

async function exec(){
    const token :string = await getResult();
    const pr = await new Promise(res => setTimeout(res,2500));
    const res =  getFinalResult(token);
    console.log(res);
}

exec();