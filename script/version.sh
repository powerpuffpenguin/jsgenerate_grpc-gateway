#!/usr/bin/env bash
set -e

BashDir=$(cd "$(dirname $BASH_SOURCE)" && pwd)
eval $(cat "$BashDir/conf.sh")
if [[ "$Command" == "" ]];then
    Command="$0"
fi
filename="$Dir/version/version.go"
function write(){
    echo package version > "$filename"
    echo  >> "$filename"
    echo  "var (" >> "$filename"
    echo  "	Version = \`$Version\`" >> "$filename"
    local commit=`git rev-parse HEAD`
	if [ "$commit" == '' ];then
		commit="[unknow commit]"
	fi
    echo "	Commit = \`$commit\`" >> "$filename"
	date=`date +'%Y-%m-%d %H:%M:%S'`
    echo "	Date = \`$date\`" >> "$filename"
    echo  ")" >> "$filename"
}
if [[ -f "$filename" ]];then
    version=$(grep Version "$filename" | awk '{print $3}')
    if [[ "\`$Version\`" !=  "$version" ]];then
        write
    fi
else
    write
fi