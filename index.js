const { exec } = require("child_process");
const path = require('path')
const fs = require('fs');
const colours = require('colors');
const inquirer = require('inquirer');

//Defining some default styles and scripts
var packages = ['bootstrap', 'jquery', '@popperjs/core'];
var packageScriptPaths = [
    'node_modules/jquery/dist/jquery.min.js',
    'node_modules/bootstrap/dist/js/bootstrap.min.js',
    'node_modules/@popperjs/core/dist/umd/popper.min.js'
];
var packageStylePaths = ['node_modules/bootstrap/dist/css/bootstrap.min.css']

// changing current directory to the user's workspace
process.chdir(path.join(process.cwd(), '../', '../'))
console.log(process.cwd());


/**  below process has 4 main functions
* 1. checkdependencies() - this check if dependencies are already exist
* 2. InstallDependencies() - this will install all the nonexist dependencies
* 3. updateAngularJson() - this will add scrpits and styles to angular.json file
* 4. updateAppComponentHtml() - this adds simple bootstrap button in html to see if process worked
**/

function checkDependencies() {
    console.log('Reading package.json'.green);
    fs.readFile('./package.json', (err, data) => {
        const pkgJson = JSON.parse(data);
        for (let dependency in pkgJson.dependencies) {
            // console.log(dependency);
            for (let package of packages) {
                if (dependency === package) {

                    let index = packages.indexOf(package);
                    console.log(index, dependency + ' already exist! '.yellow);
                    packages.splice(index, 1);
                }
            }
        }
        // console.log(packages.length);
        if (packages.length == 0) {
            console.log('All dependencies are already exist skipping installation process!'.rainbow);
            updateAngularJson();
        } else {
            installDependencies();
        }
    });


}

function installDependencies() {

    console.log('Please wait we\'re installing dependencies!'.green);
    var installString = "npm install ";
    for (let package of packages) {
        installString += package + '@latest '
    }
    installString += '--save';

    installCommand = exec(installString);

    installCommand.stdout.on('data', function (data) {
        console.log('Output: ' + data.toString());
    });

    installCommand.stderr.on('data', function (data) {
        console.log('Error: ' + data.toString());
    });

    installCommand.on('exit', function (code) {
        console.log('Installation Status ' + code.toString() == 0 ? 'Success' : 'Failed');
        updateAngularJson();
    });

}

async function updateAngularJson() {
    var angularJsonPath = path.join('./angular.json');
    console.log('Reading angular.json'.green);
    fs.readFile(angularJsonPath, async (err, data) => {
        if (err) {
            if (err.errno == -4058) {
                console.log('You\'re not in angular project or angular.json is not found, Try again!'.red);
            }
            return;
        };

        jsonData = JSON.parse(data);

        var projectNames = [];
        for (let key in jsonData.projects) {
            projectNames.push(key);
        }

        inquirer
            .prompt([
                {
                    type: 'rawlist',
                    name: 'projectName',
                    message: 'In which project you want to install?',
                    choices: projectNames,
                },
            ])
            .then(answers => {
                console.log('You Selected :', answers.projectName);
                let projectName = answers.projectName;
                let buildStyles = jsonData.projects[projectName].architect.build.options.styles;
                let buildScripts = jsonData.projects[projectName].architect.build.options.scripts;
                const build = modifyScriptsAndStyles(buildScripts, buildStyles);


                let testStyles = jsonData.projects[projectName].architect.test.options.styles;
                let testScripts = jsonData.projects[projectName].architect.test.options.scripts;
                const test = modifyScriptsAndStyles(testScripts, testStyles);


                if (jsonData.projects[projectName].architect.build.options.styles != build.styles) {
                    jsonData.projects[projectName].architect.build.options.styles = build.styles;
                }
                if (jsonData.projects[projectName].architect.build.options.scripts != build.scripts) {
                    jsonData.projects[projectName].architect.build.options.scripts = build.scripts;
                }
                if (jsonData.projects[projectName].architect.test.options.styles != test.styles) {
                    jsonData.projects[projectName].architect.test.options.styles = test.styles;
                }
                if (jsonData.projects[projectName].architect.test.options.scripts != test.scripts) {
                    jsonData.projects[projectName].architect.test.options.scripts = test.scripts;
                }

                const stringData = JSON.stringify(jsonData);

                fs.writeFile('./angular.json', stringData, (err) => {
                    if (err) {
                        if (err.errno == -4058) {
                            console.log('Unable to update angular.json, Try again!'.red);
                        }
                        return;
                    };
                    console.log('Scripts Updated!'.green);
                    updateAppComponentHtml();
                });
            });
    })
}

function modifyScriptsAndStyles(scripts, styles) {
    var flag = false;
    // Modifying styles
    for (let style of styles) {
        if (style == packageStylePaths[0]) {
            console.log('Bootstrap is already in the styles'.yellow);
            flag = true;
            break;
        }
    }
    if (!flag) {
        styles.push(packageStylePaths[0]);
        console.log('Style added!'.green);
    }

    // Modifying scripts
    for (let script of scripts) {
        for (let pathScript of packageScriptPaths) {
            if (script == pathScript) {
                console.log(script + ' already exist!'.yellow);
                packageScriptPaths.splice(packageScriptPaths.indexOf(pathScript), 1);
            }
        }
    }
    if (packageScriptPaths.length != 0) {
        for (let pathScript of packageScriptPaths) {
            scripts.push(pathScript);
        }
    } else {
        console.log('All scripts are already exist no need to install!'.rainbow);
    }

    return {
        scripts: scripts,
        styles: styles
    }
}


function updateAppComponentHtml() {
    var bsButton = "<button class='btn btn-primary'>Click Me</button>";
    fs.appendFile('./src/app/app.component.html', bsButton, (err) => {
        if (err) {
            if (err.errno == -4058) {
                console.log('Unable to update app.commponent.html, Try again!'.red);
            }
            return;
        };
        console.log('Bootstrap button is added to app.component.html now test it!'.green);
    });
}

checkDependencies();