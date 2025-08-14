"use strict";

import { BitStream, realloc_double_size, realloc_fixed_size } from '../BitStream.js'

export class BitstreamTests {

	test_complex(t) {
		let bs = new BitStream(2, realloc_double_size())

		for (let i=0; i < 10;i++) {
			bs.write(7,3)
		}

		let exp = [
			0b00000110,
			0b00001100,
			0b00011000,
			0b00110000,
			0b01100000,
			0b11000001,
			0b10000011,
			0b00000110,
			0b00001100
			]
	
		t.marker("array compare")
		t.assertEq(exp, bs.arr.slice(0, exp.length), t.cmp_arr_items_eq)

		bs.lock()
		let data = bs.get_stream_data()

		for (let i = 0; i < 10;i++) {
			t.mini.assertEq(3, bs.read(7))
		}

		// load and write
		bs = new BitStream(2, realloc_fixed_size(3))
		bs.set_stream_data(data)

		for (let i= 0; i< 5; i++) {
			bs.write(7,49)
		}

		bs.lock()

		for (let i = 0; i < 10;i++) {
			t.mini.assertEq(3, bs.read(7))
		}
		for (let i = 0; i < 5;i++) {
			t.mini.assertEq(49, bs.read(7))
		}
	}


	_test_bitstream_various_item_bitsize_list(t) {
		let n_items = Math.floor(Math.random()*200)+100

		let arr_org = new Array(n_items).fill().map(x => {

			let item_bit_size = Math.floor(Math.random()*8)+1
			let item_data_max_val = item_bit_size**2-1

			return { 'bit_size': item_bit_size,
				'val': Math.floor(Math.random() * item_data_max_val)
			}
		})
	
		let bs = new BitStream()
		
		arr_org.forEach(x => {
			bs.write(x.bit_size, x.val)
		})
		
		bs.lock()

		let restored = new Array()
		arr_org.forEach(x => {
			restored.push(bs.read(x.bit_size))
		})

		let org_vals = arr_org.map(x => x.val)

		t.mini.assertEq(restored, org_vals, t.cmp_arr_items_eq)

	}

	test_bitstream_various_item_bitsize_list(t) {
		for (let i=0; i<100; i++) {
			this._test_bitstream_various_item_bitsize_list(t)
		}
	}
}
