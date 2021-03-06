import Debug from 'debug';
import node from '@ddn/node-sdk/lib/test';

const debug = Debug('debug');
const expect = node.expect;

async function createPluginAsset(type, asset, secret, secondSecret) {
    return await node.ddn.assetPlugin.createPluginAsset(type, asset, secret, secondSecret)
}

describe("AOB Test", () => {
    test("注册资产 Should be ok", async (done) => {
        const obj = {
            name: node.randomIssuerName('DDN.', 3).toUpperCase(),
            desc: "DDD新币种",
            maximum: "100000000",
            precision: 2,
            strategy: '',
            allow_blacklist: '1',
            allow_whitelist: '1',
            allow_writeoff: '1',
            fee: '50000000000'
        };

        const transaction = await createPluginAsset(61, obj, node.Eaccount.password, "DDD12345");

        // var transaction = node.ddn.aob.createAsset("DDD.NCR", "DDD新币种", "100000000", 2, '', 0, 0, 0, node.Eaccount.password, "DDD12345");

        debug('transaction:', transaction)

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
                debug('body', body);

                expect(err).to.be.not.ok;
                expect(body).to.have.property("success").to.be.true;

                done();
            });
    })
});