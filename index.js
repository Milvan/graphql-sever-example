const Koa = require('koa');
const { ApolloServer, gql } = require('apollo-server-koa');
const { find, filter } = require('lodash');

// This is a (sample) collection of books we'll be able to query
// the GraphQL server for.  A more complete example might fetch
// from an existing data source like a REST API or database.
const books = [
  {
    id: '1',
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
    markets: ['SE','EN']
  },
  {
    id: '2',
    title: 'Jurassic Park',
    author: 'Michael Crichton',
    markets: ['EN']
  },
  {
    id: '3',
    title: 'Jurassic World',
    author: 'Michael C',
    markets: ['SE']
  },
];

const users = [
    {
        accountId: '1',
        name: 'kalle'
    },
    {
        accountId: '2',
        name: 'bob'
    }
];

const markets = [
    {
        id: 'SE',
        name: 'Sweden'
    },
    {
        id: 'EN',
        name: 'England'
    }
]

const userBooks = [
    {
        id: '1',
        readBooks: [
            {
                id: '3',
                timestamp: '1234'
            },
            {
                id: '1',
                timestamp: '54321'
            }
        ],

    },
    {
        id: '2',
        readBooks: []
    }
];

const bookCollections = [
    {
        collectionName: 'mostpopular',
        market: 'SE',
        books: ['3']
    },
    {
        collectionName: 'mostpopular',
        market: 'EN',
        books: ['1']
    }
];


const getLatestReadBooks = (accountId) => {
    const doc = find(userBooks, { id: accountId })
    return doc.readBooks.map(({id}) => find(books, { id }));
    // mapping in the full book item might be really heavy performance wise.
    // but if the full book object would be in the readBooks instead, then there would 
    // be a lot of duplicated data and if the name of the book changes after it was
    // read it will not be updated in my read books.
}

const getAvailableBooksByMarket = (market) => {
    return books.filter(({ markets }) => markets.includes(market));
}

const getAvailableMarketsForBook = (bookId) => {
    const book = find(books, { id: bookId });
    return book.markets.map(marketID => { return { id: marketID } }); // not mapping the full market object will make it impossible to get the name from the market in the nested query
}

const getPopularBooksByMarket = (marketId) => {
    const collection = find(bookCollections, { market: marketId, collectionName: 'mostpopular' })
    return collection.books.map(id => { return find(books, { id }); });
}


// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
const typeDefs = gql`
  # Comments in GraphQL are defined with the hash (#) symbol.

  # This "Book" type can be used in other type declarations.
  type Book {
    id: String
    title: String
    author: String
    availableMarkets: [Market]
  }

  type User {
    accountId: String
    name: String
    latestreadbooks: [Book]
  }

  type Market {
    id: String
    name: String
    availablebooks: [Book]
    mostpopularbooks: [Book]
  }

  # The "Query" type is the root of all GraphQL queries.
  # (A "Mutation" type will be covered later on.)
  type Query {
    books: [Book]
    markets: [Market]
    users: [User]
  }
`;

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
  Query: {
    books: () => books,
    markets: () => markets,
    users: () => users 
  },
  User: {
    latestreadbooks(user, args, context, info) {
        return getLatestReadBooks(user.accountId);
    }
  },
  Market: {
    availablebooks(market, args, context, info) {
        return getAvailableBooksByMarket(market.id);
    },
    mostpopularbooks(market, args, context, info) {
        return getPopularBooksByMarket(market.id);
    }
  },
  Book: {
    availableMarkets(book,args, context, info) {
        return getAvailableMarketsForBook(book.id);
    }
  }
};

// In the most basic sense, the ApolloServer can be started
// by passing type definitions (typeDefs) and the resolvers
// responsible for fetching the data for those types.
const server = new ApolloServer({ typeDefs, resolvers });

const app = new Koa();
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
    console.log('response time:', ms);
});

server.applyMiddleware({app});

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
app.listen({ port: 4000 }, () => {
  console.log(`🚀  Server ready at localhost:4000${server.graphqlPath}`);
});
