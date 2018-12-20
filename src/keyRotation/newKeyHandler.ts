import { AccessKey } from "aws-sdk/clients/iam";

/**
 * Type of the handler function that a newly created key will be passed to
 * @param key an AWS AccessKey
 */
export type NewKeyHandler = (key: AccessKey) => Promise<void>;
