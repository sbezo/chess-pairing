
import { TestCtx } from '../SimpleUnitTester.js'

import { Base64Tests } from './base64test.js'
import { BitstreamTests } from './BitstreamTests.js'
import { DullSerializerTests } from './DullSerializerTests.js'

let ctx = new TestCtx()

//ctx.execute_catch_exc([
ctx.execute([
	new Base64Tests(),
	new BitstreamTests(),
	new DullSerializerTests(),
	]
)
