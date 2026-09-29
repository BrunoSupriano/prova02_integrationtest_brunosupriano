import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('DummyJSON API', () => {
  let accessToken = '';
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://dummyjson.com';

  p.request.setDefaultTimeout(30000);

  beforeAll(async () => {
    p.reporter.add(rep);

    accessToken = await p
      .spec()
      .post(`${baseUrl}/auth/login`)
      .withJson({
        username: 'emilys',
        password: 'emilyspass',
        expiresInMins: 30
      })
      .expectStatus(StatusCodes.OK)
      .returns('accessToken');
  });
  afterAll(() => p.reporter.end());

  describe('Auth', () => {
    it('login com credenciais válidas', async () => {
      await p
        .spec()
        .post(`${baseUrl}/auth/login`)
        .withJson({
          username: 'emilys',
          password: 'emilyspass',
          expiresInMins: 30
        })
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            username: { type: 'string' }
          },
          required: ['accessToken', 'username']
        });
    });

    it('login com credenciais inválidas', async () => {
      await p
        .spec()
        .post(`${baseUrl}/auth/login`)
        .withJson({
          username: 'emilys',
          password: faker.internet.password()
        })
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectBodyContains('Invalid credentials');
    });

    it('acessar usuário autenticado com o token', async () => {
      await p
        .spec()
        .get(`${baseUrl}/auth/me`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectBodyContains('emilys');
    });
  });

  describe('Products', () => {
    it('listar produtos', async () => {
      await p
        .spec()
        .get(`${baseUrl}/products`)
        .withQueryParams('limit', 5)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({
          type: 'object',
          properties: {
            products: { type: 'array' },
            total: { type: 'number' }
          },
          required: ['products', 'total']
        });
    });

    it('buscar produto por id', async () => {
      await p
        .spec()
        .get(`${baseUrl}/products/1`)
        .expectStatus(StatusCodes.OK)
        .expectJson('id', 1);
    });

    it('produto inexistente', async () => {
      await p
        .spec()
        .get(`${baseUrl}/products/99999`)
        .expectStatus(StatusCodes.NOT_FOUND)
        .expectBodyContains("Product with id '99999' not found");
    });

    it('buscar produtos por texto', async () => {
      await p
        .spec()
        .get(`${baseUrl}/products/search`)
        .withQueryParams('q', 'phone')
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          products: [{}]
        });
    });

    it('cadastro de um novo produto', async () => {
      await p
        .spec()
        .post(`${baseUrl}/products/add`)
        .withJson({
          title: faker.commerce.productName(),
          price: faker.number.int({ min: 10, max: 500 })
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' }
          },
          required: ['id', 'title']
        });
    });

    // DummyJSON não persiste o registro criado via /add, então update e
    // delete são exercidos contra um id de seed que existe de fato.
    it('atualizar dados do produto', async () => {
      const novoTitulo = faker.commerce.productName();
      await p
        .spec()
        .put(`${baseUrl}/products/1`)
        .withJson({
          title: novoTitulo
        })
        .expectStatus(StatusCodes.OK)
        .expectBodyContains(novoTitulo);
    });

    it('excluir um produto', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/products/1`)
        .expectStatus(StatusCodes.OK)
        .expectJson('isDeleted', true);
    });
  });

  describe('Carts', () => {
    it('listar carrinhos', async () => {
      await p
        .spec()
        .get(`${baseUrl}/carts`)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({
          type: 'object',
          properties: {
            carts: { type: 'array' }
          },
          required: ['carts']
        });
    });

    it('cadastro de um novo carrinho', async () => {
      await p
        .spec()
        .post(`${baseUrl}/carts/add`)
        .withJson({
          userId: 1,
          products: [
            { id: 1, quantity: 2 },
            { id: 2, quantity: 1 }
          ]
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: { type: 'number' },
            products: { type: 'array' },
            total: { type: 'number' }
          },
          required: ['id', 'products', 'total']
        });
    });
  });

  describe('Users', () => {
    it('buscar usuários por texto', async () => {
      await p
        .spec()
        .get(`${baseUrl}/users/search`)
        .withQueryParams('q', 'Emily')
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          users: [{}]
        });
    });

    it('cadastro de um novo usuário', async () => {
      await p
        .spec()
        .post(`${baseUrl}/users/add`)
        .withJson({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          age: faker.number.int({ min: 18, max: 80 })
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: { type: 'number' },
            firstName: { type: 'string' }
          },
          required: ['id', 'firstName']
        });
    });
  });

  describe('Todos', () => {
    it('cadastro de um novo todo', async () => {
      await p
        .spec()
        .post(`${baseUrl}/todos/add`)
        .withJson({
          todo: faker.lorem.sentence(),
          completed: false,
          userId: 1
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: { type: 'number' },
            todo: { type: 'string' },
            completed: { type: 'boolean' },
            userId: { type: 'number' }
          },
          required: ['id', 'todo', 'completed', 'userId']
        });
    });

    // mesmo caso do Products: /add não persiste, então o update usa um id de seed.
    it('atualizar status do todo', async () => {
      await p
        .spec()
        .put(`${baseUrl}/todos/1`)
        .withJson({
          completed: true
        })
        .expectStatus(StatusCodes.OK)
        .expectJson('completed', true);
    });
  });
});
