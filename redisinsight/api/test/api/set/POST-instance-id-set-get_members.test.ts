import {
  expect,
  describe,
  it,
  before,
  deps,
  Joi,
  requirements,
  generateInvalidDataTestCases,
  validateInvalidDataTestCase,
  validateApiCall
} from '../deps';
const { server, request, constants, rte } = deps;

// endpoint to test
const endpoint = (instanceId = constants.TEST_INSTANCE_ID) =>
  request(server).post(`/instance/${instanceId}/set/get-members`);

// input data schema // todo: review BE for transform true -> 1
const dataSchema = Joi.object({
  keyName: Joi.string().allow('').required(),
  cursor: Joi.number().integer().min(0).allow(true).required().messages({
    'any.required': 'cursor should not be empty'
  }),
  count: Joi.number().integer().min(1).allow(true, null).messages({
    'any.required': 'count should not be empty'
  }),
  match: Joi.string().allow(null),
}).strict();

const validInputData = {
  keyName: constants.getRandomString(),
  cursor: 0,
  count: 1,
  match: constants.getRandomString(),
};

const responseSchema = Joi.object().keys({
  keyName: Joi.string().required(),
  total: Joi.number().integer().required(),
  members: Joi.array().items(Joi.string()),
  nextCursor: Joi.number().integer().required(),
}).required();

const mainCheckFn = async (testCase) => {
  it(testCase.name, async () => {
    // additional checks before test run
    if (testCase.before) {
      await testCase.before();
    }

    await validateApiCall({
      endpoint,
      ...testCase,
    });

    // additional checks after test pass
    if (testCase.after) {
      await testCase.after();
    }
  });
};

describe('POST /instance/:instanceId/set/get-members', () => {
  before(rte.data.truncate);

  describe('Validation', () => {
    generateInvalidDataTestCases(dataSchema, validInputData).map(
      validateInvalidDataTestCase(endpoint, dataSchema),
    );
  });

  describe('Common', () => {
    before(async () => await rte.data.generateKeys(true));

    [
      {
        name: 'Should find by exact match',
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          count: 15,
          match: 'member_9'
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.keyName).to.eql(constants.TEST_SET_KEY_2);
          expect(body.total).to.eql(100);
          expect(body.members.length).to.eql(1);
        }
      },
      {
        name: 'Should not find any member',
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          count: 15,
          match: 'notExistin*'
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.keyName).to.eql(constants.TEST_SET_KEY_2);
          expect(body.total).to.eql(100);
          expect(body.members.length).to.eql(0);
        }
      },
      {
        name: 'Should query 15 members',
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          count: 15,
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.keyName).to.eql(constants.TEST_SET_KEY_2);
          expect(body.total).to.eql(100);
          expect(body.members.length).to.gte(15);
          expect(body.members.length).to.lt(100);
        }
      },
      {
        name: 'Should query by * in the end',
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          count: 15,
          match: 'member_9*'
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.keyName).to.eql(constants.TEST_SET_KEY_2);
          expect(body.total).to.eql(100);
          expect(body.members.length).to.eql(11);
        }
      },
      {
        name: 'Should query by * in the beginning',
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          count: 15,
          match: '*ber_9'
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.keyName).to.eql(constants.TEST_SET_KEY_2);
          expect(body.total).to.eql(100);
          expect(body.members.length).to.eql(1);
        }
      },
      {
        name: 'Should query by * in the middle',
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          count: 15,
          match: 'membe*_9'
        },
        responseSchema,
        checkFn: ({ body }) => {
          expect(body.keyName).to.eql(constants.TEST_SET_KEY_2);
          expect(body.total).to.eql(100);
          expect(body.members.length).to.eql(1);
        }
      },
      {
        name: 'Should return NotFound error if key does not exists',
        data: {
          keyName: constants.getRandomString(),
          cursor: 0,
        },
        statusCode: 404,
        responseBody: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Key with this name does not exist.',
        },
      },
      {
        name: 'Should return NotFound error if instance id does not exists',
        endpoint: () => endpoint(constants.TEST_NOT_EXISTED_INSTANCE_ID),
        data: {
          keyName: constants.TEST_LIST_KEY_2,
          members: [constants.getRandomString()],
        },
        statusCode: 404,
        responseBody: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Invalid database instance id.',
        },
        after: async () => {
          // check that value was not overwritten
          const scanResult = await rte.client.sscan(constants.TEST_SET_KEY_1, 0, 'count', 100);
          expect(scanResult[0]).to.eql('0'); // full scan completed
          expect(scanResult[1]).to.eql([constants.TEST_SET_MEMBER_1]);
        },
      },
    ].map(mainCheckFn);

    it('Should scan entire set', async () => {
      const members = [];
      let cursor = null;

      while (cursor !== 0) {
        await validateApiCall({
          endpoint,
          data: {
            keyName: constants.TEST_SET_KEY_2,
            cursor: cursor || 0,
          },
          checkFn: ({ body }) => {
            cursor = body.nextCursor;
            members.push(...body.members);
          },
        });
      }

      expect(members.length).to.be.gte(100);
      expect(cursor).to.eql(0);
    });
  });

  describe('ACL', () => {
    requirements('rte.acl');
    before(async () => rte.data.setAclUserRules('~* +@all'));

    [
      {
        name: 'Should add member',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
        },
      },
      {
        name: 'Should throw error if no permissions for "scard" command',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
        },
        statusCode: 403,
        responseBody: {
          statusCode: 403,
          error: 'Forbidden',
        },
        before: () => rte.data.setAclUserRules('~* +@all -scard')
      },
      {
        name: 'Should throw error if no permissions for "sismember" command',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
          match: 'asd',
        },
        statusCode: 403,
        responseBody: {
          statusCode: 403,
          error: 'Forbidden',
        },
        before: () => rte.data.setAclUserRules('~* +@all -sismember')
      },
      {
        name: 'Should throw error if no permissions for "sscan" command',
        endpoint: () => endpoint(constants.TEST_INSTANCE_ACL_ID),
        data: {
          keyName: constants.TEST_SET_KEY_2,
          cursor: 0,
        },
        statusCode: 403,
        responseBody: {
          statusCode: 403,
          error: 'Forbidden',
        },
        before: () => rte.data.setAclUserRules('~* +@all -sscan')
      },
    ].map(mainCheckFn);
  });
});
