---
title: Generating TypeScript Definition Files from JavaScript
published: false
description: -
tags: javascript, typescript, jsdoc, buildless
---

At [open-wc](https://open-wc.org), we are big fans of [buildless](https://dev.to/open-wc/on-the-bleeding-edge-3cb8) development setups. We have [a post](https://dev.to/open-wc/developing-without-a-build-1-introduction-26ao) or [two](https://dev.to/open-wc/developing-without-a-build-2-es-dev-server-1cf5) about it 😄. [We believe](https://open-wc.org/about/rationales.html) that the future is all about coming back to the web platform. That means relying on native browser features in preference to userland or JavaScript solutions or development tools. That's why we have made it our mission to provide you the developer with the tools and techniques to use the platform _today_, even before legacy browsers are finally dropped.

This approach grants us tremendous advantages in <abbr title="developer experience">DX</abbr>, performance, and accessibility, but there are drawbacks. JavaScript, famously, is dynamically typed. Developers who want to enjoy type checking at development time will typically reach for Microsoft's TypeScript, Facebook's Flow, or Google's Clojure compiler. All of these require a build step.

Can we enjoy a safely typed developer experience while "staying true" to the web platform? Let's first dive in and see what Types can give us.

## Examples in TypeScript

Let's say we want a function which takes a number or string and returns the square.

```js
// helpers.test.ts
import { square } from '../helpers';

expect(square(2)).to.equal(4);
expect(square('two')).to.equal(4);
```

Our function's TypeScript implementation might look like this:

```ts
// helpers.ts
export function square(number: number) {
  return number * number;
}
```

I know what you're thinking: a string as an argument? While implementing, we discovered that that was a bad idea, too.

Thanks to the type safety of TypeScript, and the mature ecosystem of developer tools surrounding it like IDE support, we can tell before we even run our tests that `square('two')` will not work.

![Screenshot of the source code of helpers.test.ts in Microsoft's Visual Studio Code editor, clearly showing an error signal on line 3, where the function square is called with a string as the argument](https://raw.githubusercontent.com/daKmoR/generate-typescript-definition-files-from-javascript/master/images/01-ts-square-two.png)

If we run the TypeScript compiler `tsc` on our files, we'll see the same error:

```bash
$ npm i -D typescript
$ npx tsc
helpers.tests.ts:8:19 - error TS2345: Argument of type '"two"' is not assignable to parameter of type 'number'.

8     expect(square('two')).to.equal(4);
                    ~~~~~

Found 1 error.
```

Type safety helped us catch this error before we pushed it to production. How can we accomplish this kind of type safety without using TypeScript as a build step?

## Achieving Type Safety in Vanilla JavaScript

Our first step will be to rename our files from `.ts` to `.js`. Then we will use [browser-friendly import statements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) in our JavaScript files by using relative urls with `.js` file extensions:

```js
// helpers.test.js
import { square } from '../helpers.js';

expect(square(2)).to.equal(4);
expect(square('two')).to.equal(4);
```

Then, we will refactor our TypeScript function to JavaScript by stripping out the explicit type checks:

```js
// helpers.js
export function square(number) {
  return number * number;
}
```

Now, if we go back to our test file, we no longer see the error at `square('two')`, when we pass the wrong type (string) to the function 😭!

![In the JavaScript version of the test file, Visual Studio Code no longer shows the error on line 3 when string is called with a string](https://raw.githubusercontent.com/daKmoR/generate-typescript-definition-files-from-javascript/master/images/02-js-square-two.png)

If you're thinking "Oh well, JavaScript is dynamically typed, there's nothing to be done about it", then check this out: we actually can achieve type safety in vanilla JavaScript, using JSDoc comments.

## Adding Types to JavaScript Using JSDoc

[JSDoc](https://jsdoc.app/) is a long-standing inline documentation format for JavaScript. Typically, you might use it to automatically generate documentation for your server's API or your [web component's attributes](https://github.com/runem/web-component-analyzer). Today, we're going to use it to achieve type safety in our editor.

First, add a JSDoc comment to your function. The docblockr plugin for [VSCode](https://marketplace.visualstudio.com/items?itemName=jeremyljackson.vs-docblock) and [atom](https://atom.io/packages/docblockr) can help you do this quickly.

```js
/**
 * The square of a number
 * @param {number} number
 * @return {number}
 */
export function square(number) {
  return number * number;
}
```

Next, we'll configure the TypeScript compiler to check JavaScript files as well as TypeScript files, by adding a `tsconfig.json` to our project's root directory.

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

> Hey! I thought you said we weren't going to be using TypeScript here?!

You're right, although we will be authoring and publishing browser-standard JavaScript, our editor tools will be using the [TypeScript Language Server](https://github.com/theia-ide/typescript-language-server) under the hood to provide us with type-checking.
Doing this allows us to get exactly the same behaviour in VSCode and Atom as with TypeScript.

![Screenshot of VSCode showing the same type-checking as in the first figure, but using the annotated JavaScript files](https://raw.githubusercontent.com/daKmoR/generate-typescript-definition-files-from-javascript/master/images/03-js-square-two-typed-error.png)

We even get the same behaviour when running `tsc`.

```bash
$ npx tsc
test/helpers.tests.js:8:19 - error TS2345: Argument of type '"two"' is not assignable to parameter of type 'number'.

8     expect(square('two')).to.equal(4);
                    ~~~~~

Found 1 error.
```

## Refactoring

Great, we've written our `square` feature, including type checks, and pushed it to production. But some time later, the product team came to us saying that an important customer wants to be able to increment the numbers we square for them before we apply the power. This time, the product team already spoke with QA, who worked through the night to provide the following tests for our refactored feature:

```js
expect(square(2, 10)).to.equal(14);
expect(square(2, 'ten')).to.equal(14);
```

However, it appears that they probably should have spent those hours sleeping, as our original typecasting bug is still there.

How can we deliver this critical (😉) feature to our customers quickly while still maintaining type safety?

If we had implemented the feature in TypeScript, you might be surprised to learn that we don't need to add explicit type annotations to the second parameter, since we will supply it with a default value.

```ts
export function square(number: number, offset = 0) {
  return number * number + offset;
}
```

The provided default value let's TypeScript statically analyse the code to _infer_ values type.

We can get the same effect using our vanilla-js-and-jsdoc production implementation:

```js
/**
 * The square of a number
 * @param {number} number
 * @return {number}
 */
export function square(number, offset = 0) {
  return number * number + offset;
}
```

In both cases, `tsc` will give the error:

```bash
test/helpers.tests.js:13:22 - error TS2345: Argument of type '"ten"' is not assignable to parameter of type 'number'.

13     expect(square(2, 'ten')).to.equal(14);
                        ~~~~~
```

Also in both cases, the only thing we needed to add was `offset = 0` as it contains the type information already. If we wanted to add an explicit type definition, we could have added a second `@param {number} offset` annotation, but for our purposes, this was unnecessary.

## Publishing a Library

If you want people to be able to use your code, you're going to need to publish it at some point. For JavaScript and TypeScript, that typically means `npm`.
You will also want to provide your users with the same editor-level type safety that you've been enjoying.
To accomplish that, you can publish Type Declaration files (`*.d.ts`)in the root directory of the package you are publishing. TypeScript and the TypeScript Language Sever will respect those declaration files by default whenever they are found in a project's `node_modules` folder.

For TypeScript files, this is straightforward, we just add these options to `tsconfig.json`...

```json
"noEmit": false,
"declaration": true,
```

...and TypeScript will generate `*.js` and `*.d.ts` files for us.

```js
// helpers.d.ts
export declare function square(number: number, offset?: number): number;

// helpers.js
export function square(number, offset = 0) {
  return number * number + offset;
}
```

(Note that the output of the `js` file is exactly the same we wrote in our js version.)

### Publishing JavaScript Libraries

Sadly, as of now `tsc` does not support generating `*.d.ts` files from JSDoc annotated files.
We hope it will in the future, and in fact, the original [issue](https://github.com/microsoft/TypeScript/issues/7546) for the feature is still active, and it seems to be on board for `3.7`. Don't take our word for it, the [Pull Request](https://github.com/microsoft/TypeScript/pull/32372) is in flight.

In fact, this works so well that we are using it in production for [open-wc](https://github.com/open-wc/open-wc/blob/master/package.json#L7).

> !WARNING!
> This is an unsupported version => if something does not work no one is going to fix it.
> Therefore if your use-case is not supported you will need to wait for the official release of TypeScript to support it.

We took the liberty of publishing a forked version [typescript-temporary-fork-for-jsdoc](https://www.npmjs.com/package/typescript-temporary-fork-for-jsdoc) which is just a copy of the above pull request.

## Generate TypeScript Definition Files for JSDoc Annotated JavaScript

So now that we have all the information. Let's make it work 💪!

1. Write your code in JS and apply JSDoc where needed
2. Use the forked TypeScript `npm i -D typescript-temporary-fork-for-jsdoc`
3. Have a `tsconfig.json` with at least the following:
    ```js
    "allowJs": true,
    "checkJs": true,
    ```
4. Do "type linting" via `tsc`, ideally in a `pre-commit` hook via [husky](https://github.com/typicode/husky)
5. Have `tsconfig.build.json` with at least
    ```js
    "declaration": true,
    "allowJs": true,
    "checkJs": true,
    "emitDeclarationOnly": true,
    ```
6. Generate Types via `tsc -p tsconfig.build.types.json`, ideally in <abbr title="continuous integration">CI</abbr>
7. Publish both your `*.js` and `*.d.ts` files

We have exactly this setup at [open-wc](https://github.com/open-wc/open-wc) and it served us well so far.

Congratulations you now have a type safety without a build step :tada:

## Conclusions

To sum it all up - why are we fans of TypeScript even though it requires a build step?

It comes down to 2 things:

- Typings can be immensely useful (type safety, auto-complete, documentation, etc.) for you and/or your users
- TypeScript is very flexible and supports types for "just" JavaScript as well

## Further Resources

If you'd like to know more about using JSDoc for type safety, we recommend the following blog posts:

- [Type-Safe Web Components with JSDoc](https://dev.to/dakmor/type-safe-web-components-with-jsdoc-4icf)
- [Type Safe JavaScript with JSDoc](https://medium.com/@trukrs/type-safe-javascript-with-jsdoc-7a2a63209b76)

## Acknowledgements

Follow us on [Twitter](https://twitter.com/openwc), or follow me on my personal [Twitter](https://twitter.com/dakmor).
Make sure to check out our other tools and recommendations at [open-wc.org](https://open-wc.org).

Thanks to [Benny](https://dev.to/bennypowers), [Lars](https://github.com/LarsDenBakker) and [Pascal](https://twitter.com/passle_) for feedback and helping turn my scribbles to a followable story.
