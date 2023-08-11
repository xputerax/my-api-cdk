const { Stack, aws_cognito, RemovalPolicy } = require('aws-cdk-lib');
const { AccountRecovery, UserPoolEmail, ClientAttributes, OAuthScope } = require('aws-cdk-lib/aws-cognito');
const api_gw = require('aws-cdk-lib/aws-apigateway');
const lambda = require('aws-cdk-lib/aws-lambda')

// const sqs = require('aws-cdk-lib/aws-sqs');

class MyApiCdkStack extends Stack {
  /**
  *
  * @param {Construct} scope
  * @param {string} id
  * @param {StackProps=} props
  */
  constructor(scope, id, props) {
    super(scope, id, props);

    const userPool = new aws_cognito.UserPool(this, "UserPool", {
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      email: UserPoolEmail.withCognito(),
      signInAliases: {
        email: true,
        phone: false,
        username: false,
      },
      passwordPolicy: {
        minLength: 6,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: false,
        requireUppercase: false
      },
      deletionProtection: true,
      selfSignUpEnabled: true,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const userPoolDomain = new aws_cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: 'mydemoauth123'
      },
    })

    const userPoolClient = userPool.addClient("MyDemoAppClient", {
      writeAttributes: new ClientAttributes().withStandardAttributes({
        email: true,
        name: true,
      }),
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [ OAuthScope.EMAIL, OAuthScope.PHONE, OAuthScope.OPENID ],
        callbackUrls: [
          'https://example.com/callback'
        ]
      },
    })

    const defaultLambdaHandler = new lambda.Function(this, "MyLambdaFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('resources'),
      handler: "default-handler.main",
    })

    const restApi = new api_gw.RestApi(this, "MyApiGateway", {
      //
    })

    const apiGatewayCognitoAuthorizer = new api_gw.CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [ userPool ],
      identitySource: api_gw.IdentitySource.header('Authorization'),
    })

    const transactionsResource = restApi.root.addResource("transactions")

    const defaultLambdaIntegration = new api_gw.LambdaIntegration(defaultLambdaHandler, { allowTestInvoke: true, })

    transactionsResource.addMethod("GET", defaultLambdaIntegration, {
      authorizer: apiGatewayCognitoAuthorizer,
      operationName: "Get All Transactions",
      authorizationType: api_gw.AuthorizationType.COGNITO,
    })
  }
}

module.exports = { MyApiCdkStack }
