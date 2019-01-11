import { IAM } from "aws-sdk";
import { AccessKey, AccessKeyMetadata, CreateAccessKeyRequest, DeleteAccessKeyRequest, ListAccessKeysRequest } from "aws-sdk/clients/iam";
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
                throw err;
            });
    }

    /**
     * Gets the existing Access Keys for a given IAM User
     * @param user the IAM User to get the Access Keys for
     */
    private getExistingKeys = (user: string): Promise<AccessKeyMetadata[]> => {
        console.log(`Retrieving existing keys for ${user}`);
        const params: ListAccessKeysRequest = {
            UserName: user,
        };

        return this.iam.listAccessKeys(params)
            .promise()
            .then((data) => {
                console.log(`Retrieved the following keys for ${user}: ${JSON.stringify(data.AccessKeyMetadata)}`);
                return data.AccessKeyMetadata;
            });
    }

    /**
     * Performs the core key rotation steps: creating a new key, propagating it as required and
     * deleting any old keys.
     * @param user the IAM User that the Access Keys belong to
     * @param keys the Access Keys to rotate
     */
    private performKeyRotation = (user: string, keys: AccessKeyMetadata[]) => {
        console.log(`Beginning key rotation.`);
        return this.createNewKey(user, keys)
            .then((key) => this.handleNewKey(user, key))
            .then(() => {
                console.log(`Deleting old keys.`);
                return this.deleteKeys(user, keys);
            })
            .then(() => console.log(`Key rotation for ${user} completed succesfully.`));
    }

    /**
     * Creates a new Access Key and performs some self-healing if an error occurs during creation.
     * If key creation fails then inactive keys will be deleted and the creation will be retried.
     * @param user the IAM User that the Access Keys belong to
     * @param keys the Access Keys to rotate
     */
    private createNewKey = (user: string, keys: AccessKeyMetadata[]): Promise<AccessKey> => {
        return this.createKey(user)
            .catch((err) => {
                console.error(`There was an error during key creation: ${JSON.stringify(err)}`);
                console.log(`Attempting to self-heal by deleting any inactive keys`);
                return this.deleteKeys(user, keys, (key) => key.Status === INACTIVE)
                    .then(() => this.createKey(user));
            });
    }

    /**
     * Creates a new Access Key.
     * @param user the IAM User to create a new Access Key for
     */
    private createKey = (user: string): Promise<AccessKey> => {
        console.log(`Creating a new Access Key for ${user}`);

        const params: CreateAccessKeyRequest = {
            UserName: user,
        };

        return this.iam.createAccessKey(params)
            .promise()
            .then((data) => {
                const newKey = data.AccessKey;
                console.log(`Created a new Access Key with ID: ${newKey.AccessKeyId}`);
                return newKey;
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
            .then(() => console.log(`Successfully handled the new key.`))
            .catch((err) => {
                console.error(`New Key Handler failed with error: ${JSON.stringify(err)}. New key will be deleted.`);
                return this.deleteKey(user, key)
                    .then(() => { throw err; });
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

        // If a filter has been provided then apply it to the keyset
        const keysToDelete = filter ? keys.filter((key) => filter(key)) : keys;

        console.log(`The following keys will be deleted: ${JSON.stringify(keysToDelete)}`);

        const promises: Array<Promise<void>> = [];
        keysToDelete.forEach((key) => promises.push(this.deleteKey(user, key)));

        return Promise.all(promises);
    }

    /**
     * Deletes a given key.
     * @param user the IAM User that the keys belong to
     * @param key the key to delete
     */
    private deleteKey = (user: string, key: AccessKeyMetadata) => {
        console.log(`Deleting Access Key: ${key.AccessKeyId} for ${user}`);
        const params: DeleteAccessKeyRequest = {
            AccessKeyId: key.AccessKeyId!,
            UserName: user,
        };

        return this.iam.deleteAccessKey(params)
            .promise()
            .then(() => console.log(`Deleted Access Key: ${params.AccessKeyId}`));
    }
}
