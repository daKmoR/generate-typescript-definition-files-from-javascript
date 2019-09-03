---
title: Generating TypeScript Definition Files from JavaScript
published: false
description: -
tags: javascript, typescript, jsdoc, buildless
---

First of all let me say that I have been putting this blog post off for quite a while.
I am a little afraid that I am not going to do TypeScript justice.
The reason for that is that we are going to use it heavily - but in a rather indirect way.

See - we are a big fan of a [buildless](https://dev.to/open-wc/on-the-bleeding-edge-3cb8) development setup. We have [a post](https://dev.to/open-wc/developing-without-a-build-1-introduction-26ao) or [two](https://dev.to/open-wc/developing-without-a-build-2-es-dev-server-1cf5) about it 😬
It is [our belief](https://open-wc.org/about/rationales.html) that it is the best way to bring developers (you) and the platform (browser) back on the same table.

Knowing this makes it hard to root for TypeScript as it is a [Transpiler Language]() - in other words, it requires a build step.

So how come we are still fans?
Let's dive into and see what Types can give you.

#### We will start by writing some tests in TypeScript:

```js
// helpers.test.ts
import { square } from '../helpers';

expect(square(2)).to.equal(4);
expect(square('two')).to.equal(4);
```

Our plan is to accept a number or string and return the square of it.

Let's implement it with TypeScript:

```ts
// helpers.ts
export function square(number: number) {
  return number * number;
}
```

So yeah I know what you have been thinking - a string as an argument?
While implementing we found out that it was a bad idea.
And thanks to the power of types we can just go back to our code/tests and tada we immediately see in vscode that `square('two')` is not working.

![01-ts-square-two](https://raw.githubusercontent.com/daKmoR/generate-typescript-definition-files-from-javascript/master/images/01-ts-square-two.png)

And we will, of course, get the same if we try to run `tsc`.

```bash
npm i -D typescript
```

```bash
$ npx tsc
helpers.tests.ts:8:19 - error TS2345: Argument of type '"two"' is not assignable to parameter of type 'number'.

8     expect(square('two')).to.equal(4);
                    ~~~~~

Found 1 error.
```

#### Let's reproduce it in JavaScript

For the tests we only have to change the import to `*.js`.

```js
// helpers.test.js
import { square } from '../helpers.js';

expect(square(2)).to.equal(4);
expect(square('two')).to.equal(4);
```

In the actual code, we'll remove the type

```js
// helpers.js
export function square(number) {
  return number * number;
}
```

So now, if we go back to the tests, we don't see that `square('two')` is wrong 😭.

![02-js-square-two](https://raw.githubusercontent.com/daKmoR/generate-typescript-definition-files-from-javascript/master/images/02-js-square-two.png)

And that's the power of types! But we can make it work for JavaScript as well 🤗

Let's add types via JsDoc

```js
/**
 * @param {number} number
 */
export function square(number) {
  return number * number;
}
```

and configure TypeScript to check for JavaScript as well by adding a `tsconfig.json`.

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node",
    "lib": ["es2017", "dom"],
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": false,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "types": ["mocha"],
    "esModuleInterop": true
  },
  "include": ["test", "src"]
}
```

Doing this allows us to get exactly the same behaviour in VSCode as with TypeScript.

![03-js-square-two-typed](https://raw.githubusercontent.com/daKmoR/generate-typescript-definition-files-from-javascript/master/images/03-js-square-two-typed.png)

We even get the same behaviour when running `tsc`.

```bash
$ npx tsc
test/helpers.tests.js:8:19 - error TS2345: Argument of type '"two"' is not assignable to parameter of type 'number'.

8     expect(square('two')).to.equal(4);
                    ~~~~~

Found 1 error.
```

### Enhancing our code

Let's assume we want to also add an offset (best I could come up with :see_no_evil:)
e.g.

```js
expect(square(2, 10)).to.equal(14);
expect(square(2, 'ten')).to.equal(14);
```

First up `TypeScript`:

```ts
export function square(number: number, offset = 0) {
  return number * number + offset;
}
```

I'm sure you're wondering why we don't have a type here?
It is because a default value let's TypeScript set the type based on this default value.

And now the same for `JavaScript`:

```js
/**
 * @param {number} number
 */
export function square(number, offset = 0) {
  return number * number + offset;
}
```

In both cases, it will give

```bash
test/helpers.tests.js:13:22 - error TS2345: Argument of type '"ten"' is not assignable to parameter of type 'number'.

13     expect(square(2, 'ten')).to.equal(14);
                        ~~~~~
```

Also in both cases, the only thing we needed to add was `offset = 0` as it contains the type information already.

If you wanna know more about how to use JSDoc for types I can recommend you these blog posts.

- [Type-Safe Web Components with JSDoc](https://dev.to/dakmor/type-safe-web-components-with-jsdoc-4icf)
- [Type Safe JavaScript with JSDoc](https://medium.com/@trukrs/type-safe-javascript-with-jsdoc-7a2a63209b76)

### Publishing a library

If you want people to be able to use your code, you're going to need to publish it at some point. Usually, we do this on npm.
You will also want to provide those types to your users.
That means you will need to have `*.d.ts` files in the package you are publishing.
As those are the only files that `TypeScript` respects by default in the `node_modules` folder.

#### What does it means for TypeScript?

When we publish we will run `tsc` with these settings

```json
"noEmit": false,
"declaration": true,
```

that way TypeScript will generate `*.js` and `*.d.ts` files.
It can do so fully automatically as it knows all the types - as it is _Type_Script.

The output will be

```js
// helpers.d.ts
export declare function square(number: number, offset?: number): number;

// helpers.js
export function square(number, offset = 0) {
  return number * number + offset;
}
```

e.g. the output of the js file is exactly the same we wrote in our js version.

#### What does it means for JavaScript?

Sadly as of now `tsc` does not support generating `*.d.ts` files from JSDoc annotated files.
But it probably will in the future. The original [issue](https://github.com/microsoft/TypeScript/issues/7546) is from 2016 but recently it has been said that it's planned for version `3.6` (but it didn't make it into beta) so it seems to be on the board for `3.7`. However, don't take my word for it as here is a working [Pull Request](https://github.com/microsoft/TypeScript/pull/32372).

And it is working so great that we are using it even in production for [open-wc](https://github.com/open-wc/open-wc/blob/master/package.json#L7).

> !WARNING!
> This is an unsupported version => if something does not work no one is going to fix it.
> Therefore if your use-case is not supported you will need to wait for the official release of TypeScript to support it.

So you have been warned if you still think it's a good idea to test it you feel free to do so.
We published a forked version [typescript-temporary-fork-for-jsdoc](https://www.npmjs.com/package/typescript-temporary-fork-for-jsdoc) which is just a copy of what the above Pull Request is providing. (again to be clear - we did not change anything it is a temporary fork which is good enough for our use case).

## Generate TypeScript Definition Files for JSDoc annotated JavaScript

So now that we have all the information. Let's just make it work.

1. Write your code in js and apply JSDoc where needed
2. Use the forked TypeScript `npm i -D typescript-temporary-fork-for-jsdoc`
3. Have a `tsconfig.json` with at least

```js
"allowJs": true,
"checkJs": true,
```

4. Do "type linting" via `tsc`
5. Have `tsconfig.build.json` with at least

```js
"declaration": true,
"allowJs": true,
"checkJs": true,
"emitDeclarationOnly": true,
```

6. Generate Types via `tsc -p tsconfig.build.types.json`
7. Publish your `*.js` AND `*.d.ts` files

Ideally doing the type linting happens in a `pre-commit` hook and generating the `*.d.ts` files happens in the ci for publishing.
We have exactly this setup at [open-wc](https://github.com/open-wc/open-wc) and it served us well so far.

Congratulations you now have a type safety without a build step :tada:

#### To sum it all up - why are we fans of TypeScript even though it requires a build step?

It comes down to 2 things:

- Typings can be immensely useful (type safety, auto-complete, documentation, ...) for you and/or your users
- TypeScript is very flexible and supports types for "just" JavaScript as well

Follow us on [Twitter](https://twitter.com/openwc), or follow me on my personal [Twitter](https://twitter.com/dakmor).
Make sure to check out our other tools and recommendations at [open-wc.org](https://open-wc.org).

Thanks to [Benny](https://dev.to/bennypowers), [Lars](https://github.com/LarsDenBakker) and [Pascal](https://twitter.com/passle_) for feedback and helping turn my scribbles to a followable story.
