import { AWSError, IAM } from "aws-sdk";
import { AccessKey, AccessKeyMetadata, CreateAccessKeyRequest, DeleteAccessKeyRequest, ListAccessKeysRequest } from "aws-sdk/clients/iam";
import { PromiseResult } from "aws-sdk/lib/request";
import { INACTIVE } from "./keyStatus";
import { NewKeyHandler } from "./newKeyHandler";

export class KeyRotator {

    private iam: IAM;
    private newKeyHandler: NewKeyHandler;

    /**
     * Construct a new KeyRotator
     * @param iam the IAM Service Provider
     * @param newKeyHandler the callback invoked on creation of a new key. Takes the new key as a parameter
     */
    constructor(iam: IAM, newKeyHandler: NewKeyHandler) {
        this.iam = iam;
        this.newKeyHandler = newKeyHandler;
    }

    /**
     * Rotate the Access Key(s) for a given IAM User
     * @param user the IAM User
     */
    public rotateKeys = (user: string) => {
        return this.getExistingKeys(user)
            .then((keys) => this.performKeyRotation(user, keys))
            .catch((err) => {
                console.error(`There was an error during key rotation: ${JSON.stringify(err)}`);
                return Promise.reject(err);
            });
    }

    /**
     * Gets the existing Access Keys for a given IAM User
     * @param user the IAM User to get the Access Keys for
     */
    private getExistingKeys = (user: string): Promise<AccessKeyMetadata[]> => {
        console.log(`Retrieving existing keys for User ${user}`);
        const params: ListAccessKeysRequest = {
            UserName: user,
        };

        return this.iam.listAccessKeys(params)
            .promise()
            .then((data) => {
                console.log(`Retrieved the following keys for User ${user}: ${JSON.stringify(data.AccessKeyMetadata)}`);
                return Promise.resolve(data.AccessKeyMetadata);
            });
    }

    /**
     * Performs the core key rotation steps and attempts to self-heal if there are any errors.
     * @param user the IAM User that the Access Keys belong to
     * @param keys the Access Keys to rotate
     */
    private performKeyRotation = (user: string, keys: AccessKeyMetadata[]) => {
        return this.performCoreKeyRotation(user, keys)
            .catch((err) => {
                console.error(`The following error occured during key rotation: ${JSON.stringify(err)}`);
                return this.selfHeal(user, keys);
            });
    }

    /**
     * Performs the core key rotation steps: creating a new key, propagating it as required and
     * deleting any old keys.
     * @param user the IAM User that the Access Keys belong to
     * @param keys the Access Keys to rotate
     */
    private performCoreKeyRotation = (user: string, keys: AccessKeyMetadata[]) => {
        console.log(`Performing key rotation.`);
        return this.createNewKey(user)
            .then((key) => this.handleNewKey(user, key))
            .then(() => {
                console.log("Deleting old keys.");
                return this.deleteKeys(user, keys);
            });
    }

    /**
     * Performs a self-healing step by deleting any inactive keys and then re-running the
     * core key rotation
     * @param user the IAM User that the Access Keys belong to
     * @param keys the Access Keys to rotate
     */
    private selfHeal = (user: string, keys: AccessKeyMetadata[]) => {
        console.log(`Attempting to self-heal by deleting any inactive keys`);
        return this.deleteKeys(user, keys, (key) => key.Status === INACTIVE)
            .then(() => this.performCoreKeyRotation(user, keys));
    }

    /**
     * Creates a new Access Key and updates the relevant CircleCI environment variables.
     * @param user the IAM User to create a new Access Key for
     */
    private createNewKey = (user: string): Promise<AccessKey> => {
        console.log(`Creating a new Access Key for User: ${user}`);

        const params: CreateAccessKeyRequest = {
            UserName: user,
        };

        return this.iam.createAccessKey(params)
            .promise()
            .then((data) => {
                const newKey = data.AccessKey;
                console.log(`Created a new Access Key with ID: ${newKey.AccessKeyId}`);
                return Promise.resolve(newKey);
            });
    }

    /**
     * Handles the provided key using the custom NewKeyHandler and deletes it if
     * the handler returns a rejected promise.
     * @param user the IAM User that the key belongs to
     * @param key the key to pass to the NewKeyHandler
     */
    private handleNewKey = (user: string, key: AccessKey) => {
        console.log(`Handling the newly created key.`);
        return this.newKeyHandler(key)
            .catch((err) => {
                console.error(`New Key Handler failed with error: ${JSON.stringify(err)}. New key will be deleted.`);
                return this.deleteKey(user, key)
                    .then(() => Promise.reject(err));
            });
    }

    /**
     * Deletes all keys in a given list for a given user which pass the given filter. If no filter is
     * provided then deletes all the given keys.
     * @param user the IAM User that the keys belong to
     * @param keys the list of keys to delete keys from
     * @param filter a function taking a single key and returning true if that key should be deleted and false
     *                  otherwise
     */
    private deleteKeys = (user: string, keys: AccessKeyMetadata[], filter?: (key: AccessKeyMetadata) => boolean) => {
        let keysToDelete = keys;

        // If a filter has been provided then apply it to the keyset
        if (filter) {
            keysToDelete = keys.filter((key) => filter(key));
        }

        console.log(`The following keys will be deleted: ${JSON.stringify(keysToDelete)}`);

        const promises: Array<Promise<PromiseResult<{}, AWSError>>> = [];
        keysToDelete.forEach((key) => {
            const p = this.deleteKey(user, key);
            promises.push(p);
        });

        return Promise.all(promises)
            .then(() => Promise.resolve());
    }

    /**
     * Deletes a given key.
     * @param user the IAM User that the keys belong to
     * @param key the key to delete
     */
    private deleteKey = (user: string, key: AccessKeyMetadata) => {
        console.log(`Deleting Access Key: ${key.AccessKeyId} for User ${user}`);
        const params: DeleteAccessKeyRequest = {
            AccessKeyId: key.AccessKeyId!,
            UserName: user,
        };

        return this.iam.deleteAccessKey(params)
            .promise()
            .then((data) => {
                console.log(`Deleted Access Key: ${params.AccessKeyId}`);
                return Promise.resolve(data);
            });
    }
}
