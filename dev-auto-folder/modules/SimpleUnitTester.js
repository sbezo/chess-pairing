/* brx 2025
 * Simple class for unit tests
 * features: mini tests, marker, easy extendable
 */

export class TestCtx {
	constructor(parent_=null) {
		this.func_name = null
		this.parent_ = parent_

		this.fails = 0
		this.ok = 0
		this.marker_data = ""
	}

	marker(txt="") {
		if (txt && txt !== "") {
			this.marker_data = "  (marker: "+ txt +")"
		}
		else {
			this.marker_data = ""
		}
	}

	pop_marker() {
		let res = this.marker_data
		this.marker_data = ""
		return res 
	}

	fn_ok() {
		this.ok++;
		if (!this.parent_) {
			console.log("OK: "+this.func_name+ this.pop_marker())
		}
	}

	fn_fail() {
		this.fails++;
		if (!this.parent_) {
			console.log("FAIL: "+this.func_name + this.pop_marker())
		}
	}

	cmp_arr_items_eq(arr1, arr2) {
		return arr1.length=== arr2.length &&
			arr1.every((val, i) => {
				return val === arr2[i]
			})
	}

	assertEq(v1, v2, cmp=(v1, v2) => { return v1 === v2 } ) {
		cmp(v1,v2) ? this.fn_ok() : this.fn_fail()
	}

	execute_catch_exc(test_classes) {
		return this.execute(test_classes, true)
	}

	// much easier to create and repair tests or code  when exceptions are not catched
	// use execute_catch_exc for batch tests
	execute(test_classes, catch_exception=false) {
		test_classes.forEach(cls => {
			let funcNames = Object.getOwnPropertyNames(Object.getPrototypeOf(cls))

			funcNames.forEach(name => {
				if (name.startsWith('test')) {
					let tests_before = this.ok + this.fails
					this.func_name = cls.constructor.name + "." + name
					this.mini = new TestCtx(this)
					
					if (catch_exception) {
						try {
							cls[name](this)
						}
						catch(e) {
							this.fail++
						}
					}
					else {
						cls[name](this)
					}
				
					if (this.mini.ok + this.mini.fails) {
						if (this.mini.fails) {
							console.log(`FAIL: ${this.func_name}  mini tests: OK: ${this.mini.ok} FAILS: ${this.mini.fails}`)
							this.fails++
						}
						else { // this.mini.ok > 0 and this.mini.fail is 0
							console.log(`OK: ${this.func_name}  mini tests: OK: ${this.mini.ok}`)
							this.ok++
						}
					}
					if (this.ok + this.fails == tests_before) {
						console.log(`WARN: did you miss to make testing code in ${this.func_name} ?`)
					}
				}
			})
		})
		console.log('----------------------------------------')
		console.log('Summary:')
		if (this.fails) {
			console.log(`FAIL !!! |  ${this.ok+this.fails} test(s) OK: ${this.ok} FAILS: ${this.fails}`)
		}
		else {
			console.log(`OK: ALL TESTS SUCCESSED |  ${this.ok+this.fails} test(s)`)
		}
	}
}
