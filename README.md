# GraphQL Client Models

> Use centralized models to manage derived UI data for GraphQL response.

In a client-side application, we need to deal with API response and transform it to fit our need of UI derived data. For GraphQL's response, it's trivial to transform nested & complicated data due to GraphQL's flexible nature.

Fortunately, GraphQL provides [meta-fields `__typename`](https://graphql.org/learn/queries/#meta-fields), so we're able to know the structure of GraphQL response. we can find the targeted object that we're going to transform based on GraphQL type whether it's nested inside another object or arrray.

graphql-client-models leverages GraphQL's type system and provides following benefits.

**Automatic** Automatically transform GraphQL response by your model definitions regardless the response's structure. <br>
**Centralized** Define model once and use anywhere in your code. <br>
**Lazy evalutaion** Won't calculate any field until you need it. <br>
**Small** It's a small library with zero dependency.

## Installation

```
yarn add graphql-client-models
```

## Usage

```js
import { createTransform } from 'graphql-client-models'

/* Define model and it's fields */
const models = {
  User: {
    fullName: self => `${self.firstName} ${self.lastName}`
  }
}
/* Create transform function */
const transform = createTransform(models)

client.query({
  query: gql`
    {
      user(id: 1) {
        firstName
        lastName
        followers {
          firstName
          lastName
        }
      }
    }
  `
}).then(({data}) => {
  /**
   * data = {
   *   user {
   *     firstName: 'Walter'
   *     lastName: 'White'
   *     followers: [
   *       {
   *         firstName: 'Jesse'
   *         lastName: 'Pinkman'
   *         __typename: 'User'
   *       }
   *     ]
   *     __typename: 'User'
   *   }
   * }
   */

  /* Transform response data */
  const result = transform(data)

  console.log(result.user.fullName) //=> Walter White
  console.log(result.user.followers[0].fullName) //=> Jesse Pinkman
});
```

> The example uses [apollo-client](https://github.com/apollographql/apollo-client) as the client because it adds `__typename` to each query automatically. If you are using different graphql client, you may need to add `__typename` manually.

You can also reuse model's getter.

```js
const models = {
  User: {
    fullName: self => `${self.firstName} ${self.lastName}`,
    // Reuse 'fullName' to create 'sayHello'
    sayHello: self => `Hello! This is ${self.fullName}!`
  }
}

console.log(result.user.sayHello)
// => Hello! This is Walter White!
```

You're able override existing field in response but you have to use `orginal` of the second argument to prevent infinite loop.

```js
const models = {
  User: {
    firstName: (_, { original }) =>
      `My first name is ${original.firstName}`
  }
}

console.log(result.user.firstName)
// => My first name is Walter
```

## API

### createTransform(models, [options])

**models**

Type: `object`

define getters for each type. See below for models structure.

returns `transform` function. You can use `transform` function in your server response.

### Model's structure

```
{
  <type>: {
    <field>: <getter>
  }
}
```

**options**

Type: `object`

**options.getContext**

Type: `function`<br/>
Default: `() => {}`

To pass in extra data which is not related the response data but useful in getter. The result of getContext will be passed to the getter which is been executing.

In practice, you can pass in Apollo client's instance to `getContext`, so you can use `client.readFragment` to read cached data from other requests.

```js
const models = {
  SomeModel: {
    someField: (_, { context: { client }}) => {
      client.readFragment(/*...*/) // to read cached data
    }
  }
}

createTransform(models, { getContext: () => ({ client: apolloClient }) })
```


**type**

Type: `string`

corresponding GraphQL type

**field**

Type: `string`

property name in transformation result

**getter(self, { original, root, context })**

Type: `function`

The getter will be evaluated when the property is accessed

`self`

object of current type

`original`

object of current type without getters assigned

`root`

complete response data passed to transform

`context`

returned value of `getContext`

## Future

I built this library because I heavily used Apollo GraphQL in my work. Thanks to Apollo. It saved me a lot of time dealing with GraphQL. I'd like to make it more convenient by building an apollo link for this library. By now, however, the response can not be modified in link (see: apollo-client#2534). I'll keep following the possibility to integrate it.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
