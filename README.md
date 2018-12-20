# aws-key-rotator

# Contents
1. [Overview](#Overview)
2. [Usage](#Usage)
   - [Pre-Requisites](#Pre-Requisites)
   - [Steps](#Steps)
   - [Error Handling](#Error-Handling)
3. [API](#API)
   - [KeyRotator](#KeyRotator)
   - [NewKeyHandler](#NewKeyHandler)

# Overview
`aws-key-rotator` provides functionality for rotating AWS Access Keys with customised handling for propagating a newly created key.

A typical usage example is automatically updating the Access Keys for a project's CI/CD service.

# Usage
## Pre-Requisites
1. The User(s) that you wish to rotate Access Keys for must be set up in AWS IAM.
2. The User(s) must have at most 1 active Access Key.
3. The code that calls KeyRotator must have IAM permissions to perform the following actions for the required User(s):
    ```
    iam:ListAccessKeys
    iam:DeleteAccessKey
    iam:CreateAccessKey
    iam:UpdateAccessKey
    ```

## Steps
1. Add `aws-key-rotator` as a dependency in your `package.json` file.
    ```bash
    npm install aws-key-rotator
    ```
2. Add imports in your code as required.
    ```typescript
    import { KeyRotator, NewKeyHandler } from "aws-key-rotator"
    ```
3. Create an instance of an AWS [IAM](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html) object.
   ```typescript
   const iam = new IAM();
   ```
4. Define a custom function which matches the NewKeyHandler interface.
   ```typescript
   const newKeyHandler = (key: AccessKey) => { /* your code here */ };
   ```
5. Initialise an instance of the KeyRotator object, passing in your IAM instance and NewKeyHandler.
    ```typescript
    const keyRotator = new KeyRotator(iam, newKeyHandler);
    ```
6. Run the key rotation for a given user, adding success and error handling code as required.
    ```typescript
    keyRotator.rotateKeys("YourUser")
        .then(() => { /* your 'on success' code here */ })
        .catch((err) => { /* your 'on failure' code here */ });
    ```

## Error Handling
If any error occurs as part of the call to the `rotateKeys` method then the `KeyRotator` will cease processing, perform some clean-up and return the error to the caller in the form of a rejected `Promise` containing the error.

Any errors that occur after the user's existing key(s) have been retrieved will trigger a clean-up stage that attempts to delete any inactive keys from the list of existing keys. AWS restricts users to having at most 2 Access Keys at any one time therefore rotation will fail if 2 keys are present as a new key cannot be created. Deleting inactive keys ensures that the `KeyRotator` can "self-heal" from this state and should allow it run successfully on its next attempt.

Additionally, if the user-defined `NewKeyHandler` function returns a rejected `Promise`, indicating that the required handling failed, then the `KeyRotator` will delete the newly created Access Key ensuring that the user is not left with an unusable, active Access Key.

This ensures that any errors that occur during key rotation will not result in the user's access keys being left in a bad state (e.g. no active keys, 2 different active keys, etc.).

# API

## KeyRotator
The KeyRotator class handles the bulk of the key rotation functionality. It exposes a single method to rotate the keys for a given user which is described below.

### Constructor
```typescript
constructor(iam: IAM, newKeyHandler: NewKeyHandler)
```
#### Params
***iam -*** an instance of an [IAM](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html) object from the aws-sdk library. Used to provide access to a user's AWS Access Keys.

***newKeyHandler -*** the function for handling the new key once it is created. If the handling is not successful then the KeyRotator will automatically delete the newly created key.

### rotateKeys
```typescript
rotateKeys(user: string): Promise<void>
```
Rotates the access keys for a given user by creating a new key, propagating it as required through the NewKeyHandler and then deleting the old key(s).

#### Params
***user -*** the name of the IAM User to rotate the access keys for.

#### Returns
A promise the resolves with no data if the key rotation was successful and rejects with an error if it was not.


## NewKeyHandler
An interface for defining a custom function that handles the newly created Access Key as required.
```typescript
(newKey: AccessKey) => Promise<void>
```
#### Params
***newKey -*** an instance of an AccessKey object from the aws-sdk library that is returned as part of the [createNewAccessKey](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html#createAccessKey-property) method.

#### Returns
A promise the resolves with no data if the new key handling was successful and rejects with an error if it was not.