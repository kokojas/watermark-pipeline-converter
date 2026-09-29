-- Compile this script as an Application in the same directory as server.py.
set appPath to POSIX path of (path to me)
set serverDir to do shell script "dirname " & quoted form of appPath
set targetURL to "http://127.0.0.1:8766"

try
	do shell script "curl --silent --fail --max-time 1 " & quoted form of targetURL & " > /dev/null"
on error
	do shell script "cd " & quoted form of serverDir & " && nohup /usr/bin/env python3 server.py > /tmp/watermark_converter.log 2>&1 &"
end try

repeat 20 times
	try
		do shell script "curl --silent --fail --max-time 1 " & quoted form of targetURL & " > /dev/null"
		exit repeat
	on error
		delay 0.5
	end try
end repeat

tell application "Google Chrome"
	activate
	set found to false
	repeat with w in windows
		set tabIndex to 0
		repeat with t in tabs of w
			set tabIndex to tabIndex + 1
			if URL of t starts with targetURL then
				set active tab index of w to tabIndex
				set index of w to 1
				set found to true
				exit repeat
			end if
		end repeat
		if found then exit repeat
	end repeat
	if not found then
		if (count of windows) = 0 then
			make new window
			set URL of active tab of front window to targetURL
		else
			make new tab at end of tabs of front window with properties {URL:targetURL}
		end if
	end if
end tell
