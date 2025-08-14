/* brx 2025
 */

/*
// nodejs workaround
if (typeof document !== 'undefined') {
	// in browser
}
else {
	// in nodejs
	// use unique class name 
	class NodeDocument484948494849 {;}

	var document = new NodeDocument484948494849()
	document.cookie = {}
}
*/

export class CookiesWrapper {
	// ----------------------------------------
	update_cookie(name, value, max_age=31536000) {
		//const HOUR = 3600
		//const DAY = 86400
		//const MONTH = 2592000 // (30 days)
		//const YEAR = 31536000

		////console.log("in update cookie")
		// nodejs workaround
		try {
			if (document.constructor.name == 'NodeDocument484948494849') {
				document.cookie[name] = value
				console.log("in node workaround")
				return
			}
		}			
		catch(e) {;}
		
		document.cookie = name+"="+value+'; max-age='+max_age
		
	}

	get_cookie_value(name) {
		// nodejs workaround
		try {
			if (document.constructor.name == 'NodeDocument484948494849') {
				if (document.cookie[name] === undefined) {
					return null
				}
				return document.cookie[name]
			}
		}
		catch(e) {;}

		let cookies = document.cookie.split(";").map((x) => x.trim())

		let cookie = cookies.find((cookie) => cookie.startsWith(name + "="))

		if (typeof cookie === 'undefined') return null

		return cookie.split('=')[1]
	}

	save_base64_to_cookie(name, data, max_age=31536000) {
		// https://stackoverflow.com/questions/1969232/what-are-allowed-characters-in-cookies
		data.replaceAll('/', '|')
		data.replaceAll('=', '@') 

		this.update_cookie(name, data, max_age)
	}

	load_base64_from_cookie(name) {
		let data = this.get_cookie_value(name)

		data.replaceAll('|', '/')
		data.replaceAll('@', '=') 
	
		return data
	}
}
