/*---------------------------------------------------------------------------------------------
 *  Created by Imfly on Wed Jan 29 2020 11:48:54
 *
 *  Copyright (c) 2019 DDN FOUNDATION. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import nacl from 'tweetnacl';
import sha256 from "fast-sha256";
import RIPEMD160 from "ripemd160";
import Mnemonic from "bitcore-mnemonic";
import base58check from "./base58check";
import { getBytes } from './bytes';

function randomName() {
    // Convert arguments to Array
    const array = Array.prototype.slice.apply(arguments);

    let size = 16;
    if (array.length > 2) {
        size = array.shift();
    }

    let name = array[0];
    let random = array[1];

    if (name.length > 0) {
        size = size - 1;
    }

    for (let i = 0; i < size; i++) {
        name += random.charAt(Math.floor(Math.random() * random.length));
    }

    return name;
}

function randomNethash() {
    return randomName(8, "", "abcdefghijklmnopqrstuvwxyz0123456789");
}

function randomString(max) {
    let possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%^&*@";
    return randomName(max, "", possible);
}

// 根据助记词生成密钥对
function keypair(secret) {
    const hash = Buffer.from(sha256.hash(Buffer.from(secret)))
    const keypair = nacl.sign.keyPair.fromSeed(hash);

    return {
        publicKey: bufToHex(keypair.publicKey),
        privateKey: bufToHex(keypair.secretKey)
    }
}

// 兼容处理
function getKeys(secret) {
    return keypair(secret);
}

// TODO: sign(keypair, data) -> sign(data, keypair)
async function sign(transaction, {privateKey}) {
    const hash = await getHash(transaction, true, true);
    // console.log('hash typeof', typeof hash);
    
    const signature = nacl.sign.detached(
        hash,
        Buffer.from(privateKey, "hex")
    );
    if (!transaction.signature) {
        // eslint-disable-next-line require-atomic-updates
        transaction.signature = bufToHex(signature);
    } else {
        return bufToHex(signature);
    }
}

async function secondSign(transaction, {privateKey}) {
    const hash = await getHash(transaction);
    const signature = nacl.sign.detached(hash, Buffer.from(privateKey, "hex"));
    // eslint-disable-next-line require-atomic-updates
    transaction.sign_signature = Buffer.from(signature).toString("hex")    //wxm block database
}

// hex
async function getId(data) {
    const hash = await getHash(data);
    console.log('hash: ', hash);
    
    return hash.toString("hex");
}

// 生成助记词 == node-sdk.crypto.generatePhasekey()
function generateSecret() {
    return new Mnemonic(Mnemonic.Words.ENGLISH).toString();
}

function isValidSecret(secret) {
    return Mnemonic.isValid(secret);
}

/**
 * description:
 * 字符串形式的地址，不再支持纯数字地址；
 * 1. 把地址base58解码成字节数组
 * 2. 把数组分成两个字节数组，字节数组（1）是后4字节数组，字节数组（2）是减去后4字节的数组
 * 3. 把字节数组（2）两次Sha256 Hash
 * 4. 取字节数组（2）hash后的前4位，跟字节数组（1）比较。如果相同校验通过。
 * 5. 校验通过的解码字节数组取第一个字节，地址前缀。
 * 6. 检验前缀的合法性（根据主网参数校验），注意大小写。
 * Note: address.slice(0, -4) === address.slice(0, address.length - 4)
 */
function isAddress(address, tokenPrefix) {
    if (typeof address !== "string") {
        return false;
    }
    if (!base58check.decodeUnsafe(address.slice(1))) {
        return false;
    }
    if ([tokenPrefix].indexOf(address[0]) == -1) {
        return false;
    }
    return true;
}

function generateAddress(publicKey, tokenPrefix) {
    if (typeof publicKey === "string") {
        publicKey = Buffer.from(publicKey, "hex");
    }
    const h1 = sha256.hash(publicKey);
    const h2 = new RIPEMD160().update(Buffer.from(h1)).digest();
    return tokenPrefix + base58check.encode(h2);
}

// note: tweetnacl 包的所有方法必须使用 Uint8Array 类型的参数，其他的 buffer 类型不能使用。
async function getHash(trs, skipSignature, skipSecondSignature) {
    const bytes = await getBytes(trs, skipSignature, skipSecondSignature);
    // return new Uint8Array(sha256.hash(bytes));
    return Buffer.from(sha256.hash(bytes));
}

function bufToHex(data) {
    return Buffer.from(data).toString("hex");
}

// 验证，计划重构： peer/src/kernal/transaction.js  2020.5.3
function verifyBytes(bytes, signature, publicKey) {
    const hash = sha256Bytes(Buffer.from(bytes, 'hex'));
    const signatureBuffer = Buffer.from(signature, "hex");
    const publicKeyBuffer = Buffer.from(publicKey, "hex");
    const res = nacl.sign.detached.verify(hash, signatureBuffer, publicKeyBuffer);
    return res
}

async function verify(transaction) {
    let remove = 64;

    // console.log("transaction", transaction);
    
    if (transaction.sign_signature) {
        remove = 128;
    }

    const bytes = await getBytes(transaction);
    const data2 = Buffer.allocUnsafe(bytes.length - remove);

    for (let i = 0; i < data2.length; i++) {
        data2[i] = bytes[i];
    }

    const hash = sha256Bytes(data2);

    const signatureBuffer = Buffer.from(transaction.signature, "hex");
    const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, "hex");
    const res = nacl.sign.detached.verify(hash, signatureBuffer, senderPublicKeyBuffer);

    return res;
}

async function verifySecondSignature(transaction, publicKey) {
    const bytes = await getBytes(transaction);
    const data2 = Buffer.allocUnsafe(bytes.length - 64);

    for (let i = 0; i < data2.length; i++) {
        data2[i] = bytes[i];
    }

    const hash = sha256Bytes(data2);

    const signSignatureBuffer = Buffer.from(transaction.sign_signature, "hex");
    const publicKeyBuffer = Buffer.from(publicKey, "hex");
    const res = nacl.sign.detached.verify(hash, signSignatureBuffer, publicKeyBuffer);

    return res;
}


function sha256Bytes(data) {
    return Buffer.from(sha256.hash(data));
}

export default {
    randomString,
    randomNethash,

    getBytes,
    keypair,
    getKeys,
    getId,
    getHash,

    generateSecret, // 重构： generatePhasekey() -> generateSecret()
    isValidSecret,
    generateAddress,
    isAddress,

    base58check,

    // packages
    sha256,
    sign,
    secondSign,

    // 验证： 前端验证，底层也会验证
    verify, 
    verifySecondSignature,
    verifyBytes
};
