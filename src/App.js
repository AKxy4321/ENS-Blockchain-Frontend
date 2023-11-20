import React, { useEffect, useState } from "react";
import './styles/App.css';
import {BigNumber, ethers} from "ethers";
import contractAbi from './utils/contractABI.json';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';

// Add the domain you will be minting
const tld = '.block';
const CONTRACT_ADDRESS = '0x27ed568f39035D81E5EA94996402c514ED025fFf';

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	// Add some state data properties
	const [domain, setDomain] = useState('');
    const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);
	const [contractBalance, setContractBalance] = useState(0);
	const [ownerAddress, setOwnerAddress] = useState('');
  
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/");
        return;
      }
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error)
    }
  }

  const checkIfWalletIsConnected = async () => {
	const { ethereum } = window;
  
	if (!ethereum) {
	  console.log('Make sure you have MetaMask installed!');
	  return;
	}
	ethereum.on('accountsChanged', handleAccountsChanged);
	try {
	  // Get accounts
	  const accounts = await ethereum.request({ method: 'eth_accounts' });

	  const owner = '0x75b697Ea096148e4419585191EF9F2BBAC9BBae0';
      setOwnerAddress(owner);
	  
	  if (accounts.length !== 0) {
		const account = accounts[0];
		setCurrentAccount(account);
	  } else {
		setCurrentAccount('');
	  }
  
	  // Get chainId
	  const chainId = await ethereum.request({ method: 'eth_chainId' });
	  setNetwork(networks[chainId]);
  
	  ethereum.on('chainChanged', handleChainChanged);
  
	  function handleChainChanged(_chainId) {
		// Reload the page or update the necessary state when the chain changes
		window.location.reload();
	  }
	} catch (error) {
		console.log(error);
	  }
	};

  const fetchContractBalance = async () => {
	try {
	  const { ethereum } = window;
	  if (ethereum) {
		const provider = new ethers.providers.Web3Provider(ethereum);
		// Fetch the contract balance
		const balance = await provider.getBalance(CONTRACT_ADDRESS);
		setContractBalance(ethers.utils.formatEther(balance));
	  }
	} catch (error) {
	  console.log(error);
	}
  };

  const updateDomain = async () => {
	if (!record || !domain) { return }
	setLoading(true);
	console.log("Updating domain", domain, "with record", record);
	  try {
	  const { ethereum } = window;
	  if (ethereum) {
		const provider = new ethers.providers.Web3Provider(ethereum);
		const signer = provider.getSigner();
		const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
  
		let tx = await contract.setRecord(domain, record);
		await tx.wait();
		console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);
  
		fetchMints();
		setRecord('');
		setDomain('');
	  }
	  } catch(error) {
		console.log(error);
	  }
	setLoading(false);
  }

  const switchNetwork = async () => {
	if (window.ethereum) {
	  try {
		// Try to switch to the Mumbai testnet
		await window.ethereum.request({
		  method: 'wallet_switchEthereumChain',
		  params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
		});
	  } catch (error) {
		// This error code means that the chain we want has not been added to MetaMask
		// In this case we ask the user to add it to their MetaMask
		if (error.code === 4902) {
		  try {
			await window.ethereum.request({
			  method: 'wallet_addEthereumChain',
			  params: [
				{	
				  chainId: '0x13881',
				  chainName: 'Polygon Mumbai Testnet',
				  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
				  nativeCurrency: {
					  name: "Mumbai Matic",
					  symbol: "MATIC",
					  decimals: 18
				  },
				  blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
				},
			  ],
			});
		  } catch (error) {
			console.log(error);
		  }
		}
		console.log(error);
	  }
	} else {
	  // If window.ethereum is not found then MetaMask is not installed
	  alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
	} 
  }
  
  const fetchMints = async () => {
	try {
	  const { ethereum } = window;
	  if (ethereum) {
		// You know all this
		const provider = new ethers.providers.Web3Provider(ethereum);
		const signer = provider.getSigner();
		const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
		  
		// Get all the domain names from our contract
		const names = await contract.getAllNames();
		  
		// For each name, get the record and the address
		const mintRecords = await Promise.all(names.map(async (name) => {
		const mintRecord = await contract.records(name);
		const owner = await contract.domains(name);
		return {
		  id: names.indexOf(name),
		  name: name,
		  record: mintRecord,
		  owner: owner,
		};
	  }));
  
	  console.log("MINTS FETCHED ", mintRecords);
	  setMints(mintRecords);
	  }
	} catch(error){
	  console.log(error);
	}
  }

  const mintDomain = async () => {
	// Don't run if the domain is empty
	if (!domain) {
	  return;
	}
	// Alert the user if the domain is too short
	if (domain.length < 3) {
	  alert('Domain must be at least 3 characters long');
	  return;
	}
	// Calculate price based on the length of the domain
	const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
	console.log("Minting domain", domain, "with price", price);
	try {
	  const { ethereum } = window;
	  if (ethereum) {
		const provider = new ethers.providers.Web3Provider(ethereum);
		const signer = provider.getSigner();
		const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
		
		// Calculate the total cost including gas
		const gasPrice = await provider.getGasPrice();
		const gasCost = ethers.utils.formatEther(gasPrice.mul(21000)); // Assuming gas limit is 21000
		const totalCost = parseFloat(gasCost) + parseFloat(price);

		// Check if the total cost is greater than the current wallet balance
		const walletBalance = await provider.getBalance(currentAccount);
		const wbalance = parseFloat(walletBalance)/10 ** 18;
		console.log('Wallet Balance = ', wbalance);
		console.log('Gas Cost + Fees = ', totalCost);
		
		if (wbalance < totalCost) {
		  alert("Insufficient funds to mint the domain. Please add funds to your wallet.");
		  return;
		}
		
		console.log("Going to pop wallet now to pay gas...")
		let tx = await contract.register(domain, { value: ethers.utils.parseEther(price) });
		// Wait for the transaction to be mined
		const receipt = await tx.wait();
  
		// Check if the transaction was successfully completed
		if (receipt.status === 1) {
		  console.log("Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash);
  
		  // Set the record for the domain
		  tx = await contract.setRecord(domain, record);
		  await tx.wait();
  
		  console.log("Record set! https://mumbai.polygonscan.com/tx/" + tx.hash);
  
		  // Call fetchMints after 2 seconds
		  setTimeout(() => {
			fetchMints();
		  }, 2000);
  
		  setRecord('');
		  setDomain('');
		  
		  fetchContractBalance();
		  
		  // Display a popup
		  window.alert('Domain minted successfully!');
		} else {
		  alert("Transaction failed! Please try again");
		}
	  }
	} catch (error) {
	  console.log(error);
	}
  }  
  
  // Add a function to withdraw funds for the owner
  const withdrawFunds = async () => {
  	try {
  	  const { ethereum } = window;
  	  if (ethereum) {
  		const provider = new ethers.providers.Web3Provider(ethereum);
  		const signer = provider.getSigner();
  		const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
    
  		// Check if the current account is the owner
  		const owner = await contract.owner();
  		if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
  		  alert("Only the owner can withdraw funds");
  		  return;
  		}
    
  		// Withdraw funds
  		const tx = await contract.withdraw();
  		await tx.wait();
  		console.log("Funds withdrawn! Transaction hash: ", tx.hash);
    
  		// Update the contract balance after withdrawal
  		fetchContractBalance();
  	  }
  	} catch (error) {
	  console.log(error);
  	}
    };
  
	const handleAccountsChanged = (accounts) => {
		// Handle the account change event
		if (accounts.length > 0) {
		  setCurrentAccount(accounts[0]);
		} else {
		  setCurrentAccount('');
		}
		window.location.reload();
	  };

  // Add this render function next to your other render functions
  const renderMints = () => {
	if (currentAccount && mints.length > 0) {
	  const lastThreeMints = mints.slice(-4); // Get the last three items in the mints array
  
	  return (
		<div className="mint-container">
		  <p className="subtitle">Recently minted domains!</p>
		  <div className="mint-list">
			{lastThreeMints.map((mint, index) => (
			  <div className="mint-item" key={index}>
				<div className="mint-row">
				  <a
					className="link"
					href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
					target="_blank"
					rel="noopener noreferrer"
				  >
					<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
				  </a>
				  {/* If mint.owner is currentAccount, add an "edit" button*/}
				  {mint.owner.toLowerCase() === currentAccount.toLowerCase() ? (
					<button className="edit-button" onClick={() => editRecord(mint.name)}>
					  <img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
					</button>
				  ) : null}
				</div>
				<p> {mint.record} </p>
			  </div>
			))}
		  </div>
		</div>
	  );
	}
  };
  
  // This will take us into edit mode and show us the edit buttons!
  const editRecord = (name) => {
	console.log("Editing record for", name);
	setEditing(true);
	setDomain(name);
  }

	// Render methods
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
      {/* Call the connectWallet function we just wrote when the button is clicked */}
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

	// Form to enter domain name and data
	const renderInputForm = () =>{
		if (network !== 'Polygon Mumbai Testnet') {
		  return (
			<div className="connect-wallet-container">
			  <p>Please connect to Polygon Mumbai Testnet</p>
			  <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
			</div>
		  );
		}
	
		return (
		  <div className="form-container">
			<div className="first-row">
			  <input
				type="text"
				value={domain}
				placeholder='domain'
				onChange={e => setDomain(e.target.value)}
			  />
			  <p className='tld'> {tld} </p>
			</div>
	
			<input
			  type="text"
			  value={record}
			  placeholder='Description?'
			  onChange={e => setRecord(e.target.value)}
			/>
			  {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
			  {editing ? (
				<div className="button-container">
				  {/* This will call the updateDomain function we just made */}
				  <button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
					Set record
				  </button>  
				  {/* This will let us get out of editing mode by setting editing to false */}
				  <button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
					Cancel
				  </button>  
				</div>
			  ) : (
				// If editing is not true, the mint button will be returned instead
				<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
				  Mint
				</button>  
			  )}
			{currentAccount && ownerAddress && ownerAddress.toLowerCase() === currentAccount.toLowerCase() && (
            <button className='cta-button mint-button' disabled={loading} onClick={withdrawFunds}>
              Withdraw Funds
            </button>)}

		  </div>
		);}

	  {!currentAccount && renderNotConnectedContainer()}
	  {currentAccount && renderInputForm()}

	  useEffect(() => {
		checkIfWalletIsConnected();
		fetchContractBalance();
		if (network === 'Polygon Mumbai Testnet') {
		  fetchMints();
		}
	  }, [currentAccount, network]);

	return (
		<div className="App">
			<div className="container">
			<div className="header-container">
		  	  <header>
		  	    <div className="left">
		  	      <p className="title">Block Name Service</p>
		  	      <p className="subtitle">Your Blockchain Buddy!</p>
		  	    </div>
		  	    {/* Display a logo and wallet connection status*/}
		  	    <div className="log">
				  <img alt="Network logo" className="logo" src={ network && network.includes("Polygon") ? polygonLogo : ethLogo} />
				  {currentAccount ? (
    				<p>
      					Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
      					<br />
      					Contract Balance: {contractBalance} ETH
    				</p> ) : ( <p>Not connected</p> )}
		  	    </div>
		  	  </header>
				<div className="right">
</div>
		  	</div>
				
				{!currentAccount && renderNotConnectedContainer()}
				{/* Render the input form if an account is connected */}
				{currentAccount && renderInputForm()}
				
				<div className="footer-container">
				{mints && renderMints()}  
				</div>
			</div>
		</div>
	);
};

export default App;