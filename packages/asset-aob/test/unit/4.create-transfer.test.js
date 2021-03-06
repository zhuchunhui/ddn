import Debug from 'debug';
import node from '@ddn/node-sdk/lib/test';

const debug = Debug('debug');
const expect = node.expect;

async function createPluginAsset(type, asset, secret, secondSecret) {
    return await node.ddn.assetPlugin.createPluginAsset(type, asset, secret, secondSecret)
}

describe("AOB Test", () => {
    // 加载插件
    node.ddn.init();

    it("资产转账 Should be ok", async (done) => {
        const obj = {
            recipientId: node.Daccount.address,
            currency: "DDD.NCR",
            aobAmount: "10",
            message: '测试转账',
            fee: '0',
        };

        const transaction = await createPluginAsset(65, obj, node.Eaccount.password, "DDD12345");

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

                expect(err).to.be.not.ok;

                expect(body).to.have.property("success").to.be.true;

                done();
            });

    })

});