#!/usr/bin/env bash
set -e

BashDir=$(cd "$(dirname $BASH_SOURCE)" && pwd)
eval $(cat "$BashDir/conf.sh")
if [[ "$Command" == "" ]];then
    Command="$0"
fi

function help(){
    echo "docker build helper"
    echo
    echo "Usage:"
    echo "  $Command [flags]"
    echo
    echo "Flags:"
    echo "  -g, --go         build go"
    echo "  -p, --push           push to hub"
    echo "  -h, --help          help for $Command"
}


ARGS=`getopt -o hgp --long help,go,push -n "$Command" -- "$@"`
eval set -- "${ARGS}"
go=0
push=0
while true
do
    case "$1" in
        -h|--help)
            help
            exit 0
        ;;
        -g|--go)
            go=1
            shift
        ;;
        -p|--push)
            push=1
            shift
        ;;
        --)
            shift
            break
        ;;
        *)
            echo Error: unknown flag "$1" for "$Command"
            echo "Run '$Command --help' for usage."
            exit 1
        ;;
    esac
done

if [[ "$go" == 1 ]];then
    "$BashDir/go.sh" -u -P linux/amd64
    cp "$Dir/bin/server" "$Dir/docker/server/"
fi

cd "$Dir/docker"
sudo docker build -t king011/sessionid_server:"$Version" .

if [[ "$push" == 1 ]];then
    sudo docker push king011/sessionid_server:"$Version"
fi