"use strict";

import { DullSerializer } from '../DullSerializer.js'

export class DullSerializerTests {
	_test_bitstream_same_items_array(t) {
		let size = Math.floor(Math.random()*200)+100
		let item_bit_size = Math.floor(Math.random()*8)+1
		let item_data_max_val = item_bit_size**2-1

		let arr_org = new Array(size).fill().map(
			x => Math.floor(Math.random() * item_data_max_val))
		
		let ds = new DullSerializer()
		let ds_arr = new Array()
		
		let bs = ds.int_array_to_bitstream(item_bit_size, arr_org)
		ds.serialize_bitstream(ds_arr, bs)

		let idx = { val : 0 }
		let restored = ds.deserialize_bitstream(ds_arr, idx, item_bit_size)

		t.mini.assertEq(arr_org, restored, t.cmp_arr_items_eq)

	}

	test_bitstream_same_items_array(t) {
		for (let i=0; i<100; i++) {
			this._test_bitstream_same_items_array(t)
		}
	}

	test_primitives(t) {
		let val8 = 42
		let val16 = 4242
		let string8 = "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"
		let ds = new DullSerializer()

		let arr = new Array()
		ds.appendInt8(arr, val8)
		ds.appendInt16(arr, val16)
		ds.appendString8(arr, string8)


		let idx = { val : 0 }

		t.marker("int8")
		t.assertEq(val8, ds.readInt8(arr, idx))
		t.marker("int16")
		t.assertEq(val16, ds.readInt16(arr, idx))
		t.marker("string8")
		t.assertEq(string8, ds.readString8(arr, idx))

	}

}
