# NotaCSV 📄➡️📊

A serverless API that converts XML NFe (Nota Fiscal Eletrônica) files into structured CSV format.

## ✨ Features

- **XML to CSV Conversion**: Transforms Brazilian electronic invoice XMLs to CSV
- **Serverless Architecture**: AWS Lambda, S3, SQS, DynamoDB
- **Batch Processing**: Handles up to 5 files per request
- **Status Tracking**: Real-time processing status updates at DynamoDB

## 🔧 Tech Stack

- **Language:** Javascript (Node.js 20.x)
- **Architecture:** Serveless (AWS Lambda)
- **Storage**: S3
- **Queue**: SQS
- **Database:** DynamoDB
- **Mailing**: SES

## 🚀 Getting Started

### Prerequisites
- AWS account
- Node.js 20.x
- Serverless Framework (`npm install -g serverless` or `npx serverless`)

### Run Locally

The easiest way to develop and test is to use the `dev` command:

```bash
npx serverless dev
```

This will start a local emulator of AWS Lambda and tunnel your requests to and from AWS Lambda, allowing you to interact with your function as if it were running in the cloud.

Now you can invoke the function as before, but this time the function will be executed locally. Now you can develop your function locally, invoke it, and see the results immediately without having to re-deploy.

When you are done developing, don't forget to run `serverless deploy` to deploy the function to the cloud.

### Deployment

```bash
git clone https://github.com/scostadavid/notacsv.git
cd notacsv
npm install
npx serverless deploy
```

## 📦 API Reference

### Upload Files

```bash
POST /upload
Content-Type: multipart/form-data

Params:
- email: string (required)
- files: XML files (max 5)
```

#### Example
```bash
curl -X POST \
  -F "email=user@example.com" \
  -F "files=@nota1.xml" \
  -F "files=@nota2.xml" \
  https://[api-url]/upload
```


### Architecture

graph TD
  A[Client] -->|Upload XML| B(API Gateway)
  B --> C[Lambda]
  C -->|Store files| D[S3 Bucket]
  C -->|Queue job| E[SQS]
  E --> F[Processor Lambda]
  F -->|Convert| G[CSV in S3]
  F -->|Update| H[DynamoDB]

## 📈 Roadmap

- [x] Nfe XML batch upload
- [x] Nfe XML to CSV spreadsheet processing
- [ ] Send data by e-mail
- [ ] Web app
- [ ] API Authentication (JWT)
- [ ] Public deployment

## 📂 Project Structure

```bash  
├── handlers/          # Lambda function handlers
│   ├── upload.js      # File upload endpoint
│   └── processQueue.js # SQS processing handler
├── lib/               # Shared utilities
│   └── nfe.js         # XML parsing and CSV conversion logic
├── serverless.yml     # Infrastructure as code from AWS CloudFormation
```

## 🧑‍💻 Author

- **David S. Costa**  
  [Email](mailto:me@scostadavid.dev) • [GitHub](https://github.com/scostadavid) • [Website](https://scostadavid.dev) • [LinkedIn](https://linkedin.com/in/scostadavid)

---

> This project is actively evolving. Feedback and ideas are welcome.