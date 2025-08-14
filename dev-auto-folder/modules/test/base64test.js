
"use strict";

import { base64ArrayBuffer } from '../base64ArrayBuffer.js'
import { Base64Binary } from '../Base64Binary.js'

export class Base64Tests {
	test_utf8(t) {

		const org = "€"
		const bytes = new TextEncoder().encode(org);

		const encBase64 = base64ArrayBuffer(bytes)

		const decBase64 = Base64Binary.decode(encBase64)

		const recreated = new TextDecoder().decode(decBase64)

		t.assertEq(org, recreated)
	}

	test_empty(t) {

		const org = ""
		const bytes = new TextEncoder().encode(org);

		const encBase64 = base64ArrayBuffer(bytes)

		const decBase64 = Base64Binary.decode(encBase64)

		const recreated = new TextDecoder().decode(decBase64)

		t.assertEq(org, recreated)
	}

	test_string_length_range(t) {
		for (let i = 1; i < 500; i++) {
			const org = new Array(i).fill().map(x => 'a').join()
			const bytes = new TextEncoder().encode(org);

			const encBase64 = base64ArrayBuffer(bytes)

			const decBase64 = Base64Binary.decode(encBase64)

			const recreated = new TextDecoder().decode(decBase64)

			t.mini.assertEq(org, recreated)
		}
	}

	test_random_bytes_length_range(t) {
		for (let i = 1; i < 500; i++) {
			const org = new Array(i).fill().map(x => Math.floor(Math.random()*256))

			const encBase64 = base64ArrayBuffer(org)

			const restored = Base64Binary.decode(encBase64)

			t.mini.assertEq(org, restored, t.cmp_arr_items_eq)
		}
	}
}






