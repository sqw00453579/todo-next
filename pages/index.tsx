import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import {createRef, useEffect, useState} from 'react';
import Web3 from 'web3';
import {CONTRACT_ABI, CONTRACT_ADDRESS} from '../config';
import {AbiItem} from 'web3-utils';
import {string} from "prop-types";
import Grid from '@mui/material/Grid';
import {Box, CircularProgress, Container, Input, Paper, styled, TextField} from '@mui/material';

const web3Instance = new Web3(Web3.givenProvider);
const contract = new web3Instance.eth.Contract(
    CONTRACT_ABI as AbiItem[],
    CONTRACT_ADDRESS
);

export default function Home(this: any) {
    const [account, setAccount] = useState(''); // 设置账号的状态变量
    const [checked, setChecked] = useState([0]);
    const [taskCount, setTaskCount] = useState(0);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputTodo, setInputTodo] = useState('');

    useEffect(() => {
        getTaskCount().then(res => {
            setLoading(false)
        })

        getAccount().then(res => setAccount(res))
    }, []);

    useEffect(() => {
        if (account) {
            getTaskCount().then(res => {
                setTaskCount(res)
            })
        }
    }, [account]);

    useEffect(() => {
        if (taskCount) {
            setLoading(true)
            getTask(taskCount).then(res => {
                setLoading(false)
                setTasks(res)
            })
        }
    }, [taskCount]);

    /**
     * 获取账户
     * @returns {Promise<string>}
     */
    const getAccount = async () => {
        try {
            const accounts: string[] = await web3Instance.eth.requestAccounts()
            return accounts[0];
        } catch (error) {
            console.log('getAccount error', error)
            return '';
        }
    }

    /**
     * 获取任务数
     * @returns {Promise<*>}
     */
    const getTaskCount = async () => {
        return await contract.methods.taskCount().call()
    }

    const getTask = async (taskCount: number) => {
        let _tasks: any[] = [];
        for (let i = 1; i <= taskCount; i++) {
            _tasks.push(await contract.methods.tasks(i).call() as taskModel)
        }
        return _tasks;
    }

    type taskModel = {
        id: number;
        content: string;
        completed: boolean;
        status: boolean;
    }

    const handleToggle = (id: number) => () => {
        toggleCompleted(id).then(res => {
            const currentIndex = checked.indexOf(id);
            const newChecked = [...checked];

            if (currentIndex === -1) {
                newChecked.push(id);
            } else {
                newChecked.splice(currentIndex, 1);
            }

            setChecked(newChecked);
        })
    };

    const toggleCompleted = async (id: number) => {
        setLoading(true);
        return await contract.methods.toggleCompleted(id).send({from: account}).then(() => {
            let tempList = tasks;
            tempList.forEach((item) => {
                if (item['id'] === id) {
                    (item as taskModel).completed = !(item as taskModel).completed;
                }
            })

            setTasks(tempList);
            setLoading(false);
        })
    }

    /**
     * 添加项
     * @param event
     */
    const addToDo = async (event: { keyCode: number; }) => {
        if (event.keyCode === 13) {
            setLoading(true)
            await contract.methods.createTask(inputTodo)
                .send({from: account}).then((res: { events: { TaskCreated: { returnValues: { id: any; content: any; }; }; }; }) => {
                    let tempList = tasks;

                    tempList.push({
                        id: res.events.TaskCreated.returnValues.id,
                        content: res.events.TaskCreated.returnValues.content,
                        completed: false,
                        status: true
                    });

                    setTasks(tempList)
                    setLoading(false)
                    setInputTodo('')
                })
        }
    }

    /**
     * 删除项
     * @param id
     */
    const removeToDo = async (id: number) => {
        setLoading(true)
        await contract.methods.deleteTask(id).send({from: account}).then(() => {
            let tempList: any[] = tasks;

            tempList.forEach((item) => {
                if (item['id'] === id) {
                    item.status = false;
                }
            })

            setTasks(tempList)
            setLoading(false)
        })
    }

    const inputTodoChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInputTodo(event.target.value)
    }

    const Item = styled(Paper)(({theme}) => ({
        backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
        ...theme.typography.body2,
        padding: theme.spacing(1),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    }));

    return (
        <Container fixed sx={{paddingTop: 2}}>
            <TextField id="outlined-basic" label="添加Todo" variant="outlined" size="small"
                       onChange={(e) => inputTodoChange(e)} onKeyUp={addToDo.bind(this)}/>
            <Box sx={{flexGrow: 1, marginTop: 2}}>
                <Grid container spacing={3}>
                    <Grid item xs={6}>
                        <Item>
                            <List sx={{width: '100%', bgcolor: 'background.paper'}}
                                  subheader={
                                      <ListSubheader component="div" id="nested-list-subheader">
                                          待办事项
                                      </ListSubheader>
                                  }>
                                {
                                    tasks.map((value, index) => {
                                        const labelId = `checkbox-list-label-${value}`;
                                        if (!(value as taskModel).completed && (value as taskModel).status) {
                                            return (
                                                <ListItem
                                                    key={index}
                                                    secondaryAction={
                                                        <Button size="small" variant="contained"
                                                                color="error"
                                                                onClick={removeToDo.bind(this, (value as taskModel).id)}>删除</Button>
                                                    }
                                                    disablePadding
                                                >
                                                    <ListItemButton
                                                        role={undefined}
                                                        onClick={handleToggle((value as taskModel).id)} dense>
                                                        <ListItemIcon>
                                                            <Checkbox
                                                                edge="start"
                                                                checked={checked.indexOf((value as taskModel).id) !== -1}
                                                                tabIndex={-1}
                                                                disableRipple
                                                                inputProps={{'aria-labelledby': labelId}}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText id={labelId}
                                                                      primary={(value as taskModel).content}/>
                                                    </ListItemButton>
                                                </ListItem>
                                            );
                                        }
                                    })
                                }
                            </List>
                        </Item>
                    </Grid>
                    <Grid item xs={6}>
                        <Item>
                            <List sx={{width: '100%', bgcolor: 'background.paper'}}
                                  subheader={
                                      <ListSubheader component="div" id="nested-list-subheader">
                                          已完成事项
                                      </ListSubheader>
                                  }>
                                {
                                    tasks.map((value, index) => {
                                        const labelId = `checkbox-list-label-${value}`;
                                        if ((value as taskModel).completed && (value as taskModel).status) {
                                            return (
                                                <ListItem
                                                    key={index}
                                                    secondaryAction={
                                                        <Button size="small" variant="contained"
                                                                color="error"
                                                                onClick={removeToDo.bind(this, (value as taskModel).id)}>删除</Button>
                                                    }
                                                    disablePadding
                                                >
                                                    <ListItemButton role={undefined}
                                                                    onClick={handleToggle((value as taskModel).id)}
                                                                    dense>
                                                        <ListItemIcon>
                                                            <Checkbox
                                                                edge="start"
                                                                checked={checked.indexOf(value) !== -1}
                                                                tabIndex={-1}
                                                                disableRipple
                                                                inputProps={{'aria-labelledby': labelId}}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText id={labelId}
                                                                      primary={(value as taskModel).content}/>
                                                    </ListItemButton>
                                                </ListItem>
                                            );
                                        }
                                    })
                                }
                            </List>
                        </Item>
                    </Grid>
                    <Grid item xs={12} className={`${loading ? '' : 'hide'}`}>
                        <Box sx={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: {xs: 'center', md: 'flex-content'},
                        }}>
                            <CircularProgress/>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

        </Container>
    );
}
