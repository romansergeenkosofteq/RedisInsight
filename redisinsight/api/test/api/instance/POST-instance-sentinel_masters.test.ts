import { Joi, expect, describe, it, deps, requirements, validateApiCall } from '../deps';
const { rte, request, server, constants } = deps;

const endpoint = () => request(server).post('/instance/sentinel-masters');

const responseSchema = Joi.array().items(Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().required(),
  status: Joi.string().required(),
  message: Joi.string().required(),
}));

describe('POST /instance/sentinel-masters', () => {
  requirements('rte.type=SENTINEL');

  // todo: add validation tests
  describe('Validation', function () {});
  // todo: cover connection error for incorrect host + port [describe('common')]
  describe('Common', () => {
    it('Create sentinel database', async () => {
      const dbName = constants.getRandomString();

      await validateApiCall({
        endpoint,
        statusCode: 201,
        data: {
          host: constants.TEST_REDIS_HOST,
          port: constants.TEST_REDIS_PORT,
          username: constants.TEST_REDIS_USER,
          password: constants.TEST_REDIS_PASSWORD,
          masters: [{
            alias: dbName,
            name: constants.TEST_SENTINEL_MASTER_GROUP,
            username: constants.TEST_SENTINEL_MASTER_USER,
            password: constants.TEST_SENTINEL_MASTER_PASS,
          }],
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.length).to.eql(1);
          expect(body[0].name).to.eql(constants.TEST_SENTINEL_MASTER_GROUP);
          expect(body[0].status).to.eql('success');
          expect(body[0].message).to.eql('Added');
        },
      });
    });
    it('Create sentinel database with particular db index', async () => {
      let addedId;
      const dbName = constants.getRandomString();
      const cliUuid = constants.getRandomString();
      const browserKeyName = constants.getRandomString();
      const cliKeyName = constants.getRandomString();

      await validateApiCall({
        endpoint,
        statusCode: 201,
        data: {
          host: constants.TEST_REDIS_HOST,
          port: constants.TEST_REDIS_PORT,
          username: constants.TEST_REDIS_USER,
          password: constants.TEST_REDIS_PASSWORD,
          masters: [{
            db: constants.TEST_REDIS_DB_INDEX,
            alias: dbName,
            name: constants.TEST_SENTINEL_MASTER_GROUP,
            username: constants.TEST_SENTINEL_MASTER_USER,
            password: constants.TEST_SENTINEL_MASTER_PASS,
          }],
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.length).to.eql(1);
          addedId = body[0].id;
          expect(body[0].name).to.eql(constants.TEST_SENTINEL_MASTER_GROUP);
          expect(body[0].status).to.eql('success');
          expect(body[0].message).to.eql('Added');
        },
      });

      // Create string using Browser API to particular db index
      await validateApiCall({
        endpoint: () => request(server).post(`/instance/${addedId}/string`),
        statusCode: 201,
        data: {
          keyName: browserKeyName,
          value: 'somevalue'
        },
      });

      // Create string using CLI API to 0 db index
      await validateApiCall({
        endpoint: () => request(server).post(`/instance/${addedId}/cli/${cliUuid}/send-command`),
        statusCode: 200,
        data: {
          command: `set ${cliKeyName} somevalue`,
        },
      });

      // check data created by db index
      await rte.data.executeCommand('select', `${constants.TEST_REDIS_DB_INDEX}`);
      expect(await rte.data.executeCommand('exists', cliKeyName)).to.eql(0)
      expect(await rte.data.executeCommand('exists', browserKeyName)).to.eql(1)

      // check data created by db index
      await rte.data.executeCommand('select', '0');
      expect(await rte.data.executeCommand('exists', cliKeyName)).to.eql(1)
      expect(await rte.data.executeCommand('exists', browserKeyName)).to.eql(0)
    });
  });
});
