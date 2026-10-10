@echo off
setlocal
if not defined JAVA_HOME (
    set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
)
set "MAVEN_CMD=%~dp0..\.tools\apache-maven-3.9.9\bin\mvn.cmd"
if not exist "%MAVEN_CMD%" (
    set "MAVEN_CMD=%~dp0.tools\apache-maven-3.9.9\bin\mvn.cmd"
)
if not exist "%MAVEN_CMD%" (
    mvn %*
) else (
    call "%MAVEN_CMD%" %*
)
