// passed
import Debug from 'debug';
import node from '@ddn/node-sdk/lib/test';

const debug = Debug('debug');

async function createTransfer(address, amount, secret) {
    return await node.ddn.transaction.createTransaction(address, amount, null, secret);
}

async function createSignature(secret, secondSecret) {
    return await node.ddn.signature.createSignature(secret, secondSecret);
}

async function createPluginAsset(type, asset, secret, secondSecret) {
    return await node.ddn.assetPlugin.createPluginAsset(type, asset, secret, secondSecret)
}

describe("AOB Test", () => {

    beforeAll(async (done) => {
        const transaction = await createTransfer(node.Eaccount.address, "10000000000000", node.Gaccount.password);

        node.peer.post("/transactions")
            .set("Accept", "application/json")
            .set("version", node.version)
            .set("nethash", node.config.nethash)
            .set("port", node.config.port)
            .send({
                transaction
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end((err, {
                body
            }) => {
                debug('/transactions body', body);
                node.expect(err).be.not.ok;

                node.expect(body).to.have.property("success").to.be.true;

                done();
            });
    });

    test("设置二级密码 Should be ok", async (done) => {
        await node.onNewBlockAsync()

        const issuer = await createSignature(node.Eaccount.password, "DDN12345");

        node.peer.post("/transactions")
            .set("Accept", "application/json")
            .set("version", node.version)
            .set("nethash", node.config.nethash)
            .set("port", node.config.port)
            .send({
                transaction: issuer
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end((err, {
                body
            }) => {
                node.expect(err).be.not.ok;

                node.expect(body).to.have.property("success").to.be.true;
                done();
            });
    })

    test("注册发行商 Should be ok", async (done) => {
        await node.onNewBlockAsync();

        const issuer = {
            name: "DDN",
            desc: "J G V",
            issuer_id: node.Eaccount.address,
            fee: '10000000000',
        };

        const transaction = await createPluginAsset(60, issuer, node.Eaccount.password, "DDN12345");

        // var transaction = node.ddn.aob.createIssuer("DDN", "J G V", node.Eaccount.password, "DDN12345");

        // console.log('注册发行商创建的transaction', transaction)

        node.peer.post("/transactions")
            .set("Accept", "application/json")
            .set("version", node.version)
            .set("nethash", node.config.nethash)
            .set("port", node.config.port)
            .send({
                transaction
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end((err, {
                body
            }) => {
                debug(body);

                node.expect(err).be.not.ok;
                node.expect(body).to.have.property("success").to.be.true;

                done();
            });
    })
});


// // 另一种修改方法，将aob文件夹中的四个文件测试全放到了这里
// // 直接创建一个测试账户然后测试


// describe("AOB Test", () => {

//     var account;

//     beforeAll((done) => {

//         console.log("开始创建测试账户Test");
//         node.api.get("/accounts/new")
//             .set("Accept", "application/json")
//             .set("version", node.version)
//             .set("nethash", node.config.nethash)
//             .set("port", node.config.port)
//             .expect("Content-Type", /json/)
//             .expect(200)
//             .end(function (err, res) {
//                 console.log(JSON.stringify(res.body));
//                 node.expect(res.body).to.have.property('success').to.be.true;
//                 account = res.body;
//                 console.log("创建测试账户Test成功", account);

//                 done();
//             });
//     });


//     test("利用总账户向Test账户转账100000", (done) => {
//         var transaction = createTransfer(account.address, 10000000000000, node.Gaccount.password);

//         var sTime = node.getRealTime(transaction.timestamp);
//         var sDate = new Date(sTime);
//         console.log("交易请求发起时间：" + sDate.toLocaleString() + "（" + sDate.getTime() + "）");

//         node.peer.post("/transactions")
//             .set("Accept", "application/json")
//             .set("version", node.version)
//             .set("nethash", node.config.nethash)
//             .set("port", node.config.port)
//             .send({
//                 transaction: transaction
//             })
//             .expect("Content-Type", /json/)
//             .expect(200)
//             .end(function (err, res) {
//                 console.log(JSON.stringify(res.body));
//                 node.expect(res.body).to.have.property("success").to.be.true;

//                 done();
//             });
//     });

// test("注册资产", (done) => {
//     node.onNewBlock(err => {

//         var issuer = node.ddn.aob.createAsset("DDN.NCR", "DDN新币种", "100000000", 2, '', 0, 0, 0, account.secret, "DDN12345");

//         node.peer.post("/transactions")
//             .set("Accept", "application/json")
//             .set("version", node.version)
//             .set("nethash", node.config.nethash)
//             .set("port", node.config.port)
//             .send({
//                 transaction: issuer
//             })
//             .expect("Content-Type", /json/)
//             .expect(200)
//             .end(function (err, res) {
//                 console.log(JSON.stringify(res.body));
//                 node.expect(res.body).to.have.property("success").to.be.true;

//                 done();
//             }
//         );

//     })
// })


// test("发行资产", (done) => {

//     node.onNewBlock(err => {

//         var issuer = node.ddn.aob.createIssue("DDN.NCR", "100000", account.secret, "DDN12345");

//         node.peer.post("/transactions")
//             .set("Accept", "application/json")
//             .set("version", node.version)
//             .set("nethash", node.config.nethash)
//             .set("port", node.config.port)
//             .send({
//                 transaction: issuer
//             })
//             .expect("Content-Type", /json/)
//             .expect(200)
//             .end(function (err, res) {
//                 console.log(JSON.stringify(res.body));
//                 node.expect(res.body).to.have.property("success").to.be.true;

//                 done();
//             }
//         );

//     })
// })


// test("发行资产-测试转账", (done) => {

//     node.onNewBlock(err => {

//         var issuer = node.ddn.aob.createTransfer("DDN.NCR", "10", node.Daccount.address, "测试转账", account.secret, "DDN12345");

//         node.peer.post("/transactions")
//             .set("Accept", "application/json")
//             .set("version", node.version)
//             .set("nethash", node.config.nethash)
//             .set("port", node.config.port)
//             .send({
//                 transaction: issuer
//             })
//             .expect("Content-Type", /json/)
//             .expect(200)
//             .end(function (err, res) {
//                 console.log(JSON.stringify(res.body));
//                 node.expect(res.body).to.have.property("success").to.be.true;

//                 done();
//             }
//         );
//     })
// })

// });