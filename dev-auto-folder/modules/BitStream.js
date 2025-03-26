/* brx 2025
 * https://github.com/Cantbebad
*/

"use strict";

export function realloc_double_size(limit_max_add = 0) {
	// double size of previus buffer size
	return (bitstream) => {
		let to_add = bitstream.arr.length 
		// max addon can be limited in 'limit_max_add'
		if (limit_max_add && limit_max_add < to_add) {
			to_add = limit_max_add
		}

		let newArr =new Uint8Array(bitstream.arr.length + to_add)
		newArr.set(bitstream.arr)
		newArr.set(new Uint8Array(to_add).fill(0), bitstream.arr.length)
		bitstream.arr = newArr
	}
}

// bitstream realloc strategy
export function realloc_fixed_size(realloc_size) {
	return (bitstream) => {
		// expand by realoc_size
		let newArr = new Uint8Array(bitstream.arr.length + realloc_size)
		newArr.set(bitstream.arr)
		newArr.set(new Uint8Array(realloc_size).fill(0), bitstream.arr.length)
		bitstream.arr = newArr	
	}
}

export class BitStream {
	/* Naive implementation of BitStream for limited purposes.
	 * Single write item is limited to byte size boundaries (0-255)
	 * */
	//
	// bitstream realloc strategy

	constructor(expected_length_in_bytes=4, realloc_strategy=realloc_double_size()) {
		if (expected_length_in_bytes<1) throw new Error("Out of range: expected length")
		this.arr = new Uint8Array(expected_length_in_bytes).fill(0);
		this.realloc_strategy = realloc_strategy
		this.byte_idx = 0
		this.bit_idx = 8
		this.cur_bit_length = 0
		this.locked = false
		this.n_values = 0
		if (this.realloc_strategy == null) {
			throw new Error("realloc_strategy is null")
		}
	}

	get_stream_data() {
		// for save
		// use immediatelly after lock, later, bitstream after read is modified
		// shrinks data to only used space (in bytes)
		let bytes_needed = Math.ceil(this.cur_bit_length/8)
		return { 'bit_length' : this.cur_bit_length, 
			'bytes': this.arr.slice(0, bytes_needed),
			'n_values': this.n_values
		}
	}

	set_stream_data(data) {
		// restore for read or write
		this.cur_bit_length = data.bit_length
		this.arr = new Uint8Array(data.bytes.length+1).fill(0)
		this.arr.set(data.bytes)

		this.byte_idx = Math.floor(data.bit_length/8)
		this.bit_idx = 8 - (data.bit_length % 8)
		this.n_values = data.n_values
		this.locked = false
	}

	inc_byte_idx() {
		this.byte_idx++
		if (this.arr.length <= this.byte_idx) {
			this.realloc_strategy(this)
		}
	}

	write(bit_size, byte_data) {
		if (byte_data != (((byte_data<<(8-bit_size))%256)>>(8-bit_size))) {
			throw new Error("byte_data needs more bit_size")
		}

		if (this.locked) throw new Error("bitstream is locked for write")
		if (bit_size > 8 || bit_size<1) throw new Error("Out of range: bit_size (write)")
		let data = byte_data

		let shift = this.bit_idx - bit_size
		if (shift > 0) {
			this.arr[this.byte_idx] |= (data<<shift) % 256
			this.bit_idx -= bit_size
		}
		else if (shift == 0) {
			this.arr[this.byte_idx] |= data
			this.bit_idx = 8
			this.inc_byte_idx()
		}
		else {
			// shift <0
			this.arr[this.byte_idx] |= (data>>-shift)
			this.bit_idx = 8
			this.inc_byte_idx()

			this.arr[this.byte_idx] |= (data<<(8+shift)) % 256
			this.bit_idx += shift
		}

		this.cur_bit_length += bit_size
		this.n_values++
	}
	
	lock() {
		/* lock bitstream, when you have finished with writing
		 * this enables reading it
		 */

		if (this.locked) throw new Error("bitstream can be locked only once")
		this.locked = true

		this.bit_idx = 8
		this.byte_idx = 0
	}

	read(bit_size) {
		/* NOTE: read CHANGES (=consumes) bitstream */

		if (!this.locked) throw new Error("bitstream must be locked before read")
		if (bit_size > 8 || bit_size<0) throw new Error("Out of range: bit_size (read)")
		let data = this.arr[this.byte_idx]
		let ret = 0
		let val = 0

		if (this.cur_bit_length < bit_size) {
			throw Error("trying to read beyond written data")
		}

		let shift = this.bit_idx - bit_size
		if (shift > 0) {

			val = (data>>shift)
			ret <<= bit_size
			ret |= val

			this.arr[this.byte_idx] ^= (val<<shift)
			this.bit_idx -= bit_size
		}
		else if (shift == 0) {
			val = data
			ret <<= bit_size
			ret |= val
			this.arr[this.byte_idx] = 0
			this.bit_idx = 8
			this.byte_idx++
		}
		else {
			// shift <0
			val = data
			ret <<= (bit_size + shift)
			ret |= val

			this.byte_idx++

			val = this.arr[this.byte_idx]
			let new_shift = 8+shift
			
			let val2 = (val>>new_shift)
			ret <<= -shift
			ret |= val2

			this.arr[this.byte_idx] ^= (val2<<new_shift)
			this.bit_idx = 8+shift

		}

		this.cur_bit_length -= bit_size

		return ret	
	}

	 write_int_array(item_bit_size, arr) {
		arr.forEach(item => {
			this.write(item_bit_size, item)
		})
	}
	
}
