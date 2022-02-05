#!/usr/bin/env bash

function lowercase(){
    echo "$1" | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/"
}

OS=`lowercase \`uname\``
KERNEL=`uname -r`
MACH=`uname -m`
missing_app=``
applications=(
node
yarn
nvm
python3
pip
)

function detect_os(){
  if [ "{$OS}" == "windowsnt" ]; then
      OS=windows
  elif [ "{$OS}" == "darwin" ]; then
      OS=mac
  else
      OS=`uname`
      if [ "${OS}" = "SunOS" ] ; then
          OS=Solaris
          ARCH=`uname -p`
          OSSTR="${OS} ${REV}(${ARCH} `uname -v`)"
      elif [ "${OS}" = "AIX" ] ; then
          OSSTR="${OS} `oslevel` (`oslevel -r`)"
      elif [ "${OS}" = "Linux" ] ; then
          if [ -f /etc/redhat-release ] ; then
              DistroBasedOn='RedHat'
              DIST=`cat /etc/redhat-release |sed s/\ release.*//`
              PSUEDONAME=`cat /etc/redhat-release | sed s/.*\(// | sed s/\)//`
              REV=`cat /etc/redhat-release | sed s/.*release\ // | sed s/\ .*//`
          elif [ -f /etc/SuSE-release ] ; then
              DistroBasedOn='SuSe'
              PSUEDONAME=`cat /etc/SuSE-release | tr "\n" ' '| sed s/VERSION.*//`
              REV=`cat /etc/SuSE-release | tr "\n" ' ' | sed s/.*=\ //`
          elif [ -f /etc/mandrake-release ] ; then
              DistroBasedOn='Mandrake'
              PSUEDONAME=`cat /etc/mandrake-release | sed s/.*\(// | sed s/\)//`
              REV=`cat /etc/mandrake-release | sed s/.*release\ // | sed s/\ .*//`
          elif [ -f /etc/debian_version ] ; then
              DistroBasedOn='Debian'
              DIST=`cat /etc/lsb-release | grep '^DISTRIB_ID' | awk -F=  '{ print $2 }'`
              PSUEDONAME=`cat /etc/lsb-release | grep '^DISTRIB_CODENAME' | awk -F=  '{ print $2 }'`
              REV=`cat /etc/lsb-release | grep '^DISTRIB_RELEASE' | awk -F=  '{ print $2 }'`
          fi
          if [ -f /etc/UnitedLinux-release ] ; then
              DIST="${DIST}[`cat /etc/UnitedLinux-release | tr "\n" ' ' | sed s/VERSION.*//`]"
          fi
          OS=`lowercase $OS`
          DistroBasedOn=`lowercase $DistroBasedOn`
          readonly OS
          readonly DIST
          readonly DistroBasedOn
          readonly PSUEDONAME
          readonly REV
          readonly KERNEL
          readonly MACH
      fi

  fi
  echo $OS, $KERNEL, $MACH
}

function command_exists () {
    type "$1" &> /dev/null ;
}

function install_node(){
  [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]] && curl -fsSL https://fnm.vercel.app/install | bash
}

function update_packages(){
  [[ "$OSTYPE" == "darwin"* ]] && brew update
  [[ "$OSTYPE" == "linux-gnu"* ]] && sudo apt update -y
}


function install_python_linux(){
  update_packages
  sudo apt install software-properties-common
  sudo add-apt-repository ppa:deadsnakes/ppa
  update_packages
  sudo apt install python3.8
  python --version
  sudo apt-get install python3-pip
}

function install_python_macos(){
  if ! command_exists 'brew'; then
    echo "brew not found, exiting...consider /bin/bash -c $(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
}

function install_python(){
  [[ "$OSTYPE" == "darwin"* ]] && install_python_macos 
  [[ "$OSTYPE" == "linux-gnu"* ]] && install_python_linux
}

function install_prereq() {
  [[ $missing_app == *"node"* ]] && install_node 
  [[ $missing_app == *"npm"* ]] && npm install -g npm
  [[ $missing_app == *"yarn"* ]] && npm install --global yarn
  [[ $missing_app == *"python3"* ]] && install_python
  [[ $missing_app == *"nvm"* ]] && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
}

function main() {
  for _ in "${applications[@]}"
  do
    if ! command_exists $_ ; then 
      install_prereq $_
    else 
      echo "$_ is installed..."
    fi
  done
}

detect_os
main
