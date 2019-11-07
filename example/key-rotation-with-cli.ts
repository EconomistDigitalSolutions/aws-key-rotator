
import { IAM } from "aws-sdk";
import { KeyRotator, NewKeyHandler } from "@economist/aws-key-rotator";
import { execSync } from "child_process";

const iam = new IAM();

/**
* This user name is the user name as it appears in IAM
* console, not a ARN
*/
const iamUserName = "foo";

/**
 * This is a callback that triggers when obtaining the keys
 * @param key
 */
const changeKeyHandler: NewKeyHandler = async (key: IAM.AccessKey) => {
  const { AccessKeyId, SecretAccessKey } = key;
  execSync(
    `aws configure set aws_secret_access_key ${SecretAccessKey} --profile default`,
    {}
  );
  execSync(
    `aws configure set aws_access_key_id ${AccessKeyId} --profile default`,
    {}
  );
  return Promise.resolve();
};

const keyRotator = new KeyRotator(iam, changeKeyHandler);

keyRotator
  .rotateKeys(iamUserName)
  .then(() => {
    console.log("Key rotation executed succesfully");
  })
  .catch(() => {});
